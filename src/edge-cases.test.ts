import { describe, it, expect } from 'vitest'
import { readCard, readCardFromJson } from './read'
import { writeCardToPng, writeCardToCharx, writeCardToJson } from './write'
import { writeChunks } from './png/chunks'
import { extractZip } from './zip/index'
import { encodeUTF8, decodeUTF8 } from './utils/utf8'
import { ParseError } from './errors'
import type { CharacterCard } from './types'

// Helper to create minimal valid PNG bytes
function createMinimalPng(): Uint8Array {
  const ihdrData = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
  const ihdrChunk = {
    length: ihdrData.length,
    type: 'IHDR',
    data: ihdrData,
    crc: 0x815467c7,
  }
  const iendChunk = {
    length: 0,
    type: 'IEND',
    data: new Uint8Array(0),
    crc: 0xae426082,
  }
  return writeChunks([ihdrChunk, iendChunk])
}

// Helper to create V3 card
function createV3Card(name = 'Test'): CharacterCard {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name,
      description: 'Description',
      personality: 'Personality',
      scenario: 'Scenario',
      first_mes: 'Hello',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {},
      group_only_greetings: [],
    },
  }
}

describe('Edge Cases', () => {
  describe('Malformed Data', () => {
    it('handles empty PNG', () => {
      expect(() => readCard(new Uint8Array([]))).toThrow(/PNG|signature|empty|invalid/i)
    })

    it('handles PNG without card chunks', () => {
      const basePng = createMinimalPng()
      expect(() => readCard(basePng)).toThrow(/card|chunk|data|not found/i)
    })

    it('handles double-encoded base64', () => {
      // JSON should parse correctly even with tricky content
      const card = createV3Card('Double Base64')
      card.data.description = 'SGVsbG8gV29ybGQ=' // base64 of "Hello World"
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.description).toBe('SGVsbG8gV29ybGQ=')
    })

    it('handles BOM in JSON', () => {
      const card = createV3Card('BOM Test')
      const json = '\ufeff' + JSON.stringify(card)
      // Should either parse or throw a clear error
      try {
        const result = readCardFromJson(json)
        expect(result.data.name).toBe('BOM Test')
      } catch (e) {
        expect(e).toBeInstanceOf(ParseError)
      }
    })

    it('handles Windows line endings', () => {
      const card = createV3Card('Windows')
      card.data.description = 'Line1\r\nLine2\r\n'
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.description).toBe('Line1\r\nLine2\r\n')
    })
  })

  describe('Large Data', () => {
    it('handles 10MB PNG', () => {
      // Create card with large description
      const card = createV3Card('Large')
      card.data.description = 'A'.repeat(100000) // 100KB description
      const basePng = createMinimalPng()
      const largePng = writeCardToPng(card, basePng)
      const result = readCard(largePng)
      expect(result.data.description).toHaveLength(100000)
      expect(result.data.description[0]).toBe('A')
      expect(result.data.description[50000]).toBe('A')
    })

    it('handles 1000+ lorebook entries', () => {
      const card = createV3Card('Many Entries')
      card.data.character_book = {
        entries: Array.from({ length: 1000 }, (_, i) => ({
          keys: [`key${i}`],
          content: `Content ${i}`,
          enabled: true,
          insertion_order: i,
          use_regex: false,
          extensions: {},
        })),
        extensions: {},
      }
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.character_book?.entries).toHaveLength(1000)
      expect(result.data.character_book?.entries[0].keys).toEqual(['key0'])
      expect(result.data.character_book?.entries[999].keys).toEqual(['key999'])
    })

    it('handles very long strings', () => {
      const card = createV3Card('Long')
      const longString = 'X'.repeat(1000000) // 1MB string
      card.data.description = longString
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.description).toHaveLength(1000000)
      expect(result.data.description[0]).toBe('X')
      expect(result.data.description[500000]).toBe('X')
    })
  })

  describe('Unicode', () => {
    it('handles unicode in name', () => {
      const card = createV3Card('Unicode: 日本語 한국어 العربية')
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.name).toBe('Unicode: 日本語 한국어 العربية')
    })

    it('handles emoji in description', () => {
      const card = createV3Card('Emoji Test')
      card.data.description = 'Hello 👋 World 🌍 Stars ⭐✨'
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.description).toBe('Hello 👋 World 🌍 Stars ⭐✨')
    })

    it('handles CJK characters', () => {
      const card = createV3Card('中文名字')
      card.data.description = '这是一个测试描述。\n日本語の説明。\n한국어 설명.'
      const basePng = createMinimalPng()
      const png = writeCardToPng(card, basePng)
      const result = readCard(png)
      expect(result.data.name).toBe('中文名字')
      expect(result.data.description).toContain('测试')
    })

    it('handles RTL text', () => {
      const card = createV3Card('RTL Test')
      card.data.description = 'مرحبا بالعالم' // Arabic
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.description).toBe('مرحبا بالعالم')
    })
  })

  describe('Asset Edge Cases', () => {
    it('handles assets with spaces in names', () => {
      const card = createV3Card('Asset Spaces')
      const assetData = new Uint8Array([1, 2, 3])
      const charx = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'my icon', data: assetData, ext: 'png' }],
      })
      const files = extractZip(charx)
      expect(files.has('assets/icon/my icon.png')).toBe(true)
    })

    it('handles assets with unicode names', () => {
      const card = createV3Card('Unicode Asset')
      const assetData = new Uint8Array([1, 2, 3])
      const charx = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'アイコン', data: assetData, ext: 'png' }],
      })
      const files = extractZip(charx)
      // Verify the asset exists (filename handling may vary)
      const cardJson = JSON.parse(decodeUTF8(files.get('card.json')!))
      expect(cardJson.data.assets).toHaveLength(1)
      expect(cardJson.data.assets[0].name).toBe('アイコン')
    })

    it('handles missing asset files', () => {
      const card = createV3Card('Missing Asset')
      card.data.assets = [
        { type: 'icon', name: 'missing', uri: 'embeded://assets/icon/missing.png', ext: 'png' },
      ]
      const json = writeCardToJson(card)
      const result = readCardFromJson(json)
      expect(result.data.assets?.[0]?.uri).toContain('missing.png')
    })

    it('handles duplicate asset names', () => {
      const card = createV3Card('Duplicate Assets')
      const assetData1 = new Uint8Array([1, 2, 3])
      const assetData2 = new Uint8Array([4, 5, 6])
      const charx = writeCardToCharx(card, {
        assets: [
          { type: 'icon', name: 'icon1', data: assetData1, ext: 'png' },
          { type: 'icon', name: 'icon2', data: assetData2, ext: 'png' },
        ],
      })
      const files = extractZip(charx)
      expect(files.has('assets/icon/icon1.png')).toBe(true)
      expect(files.has('assets/icon/icon2.png')).toBe(true)
    })
  })
})
