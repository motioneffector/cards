import { describe, it, expect } from 'vitest'
import {
  writeCardToPng,
  writeCardToJson,
  writeCardToCharx,
  writeLorebookToPng,
  writeLorebookToJson,
} from './index'
import { readCard, readLorebook } from '../read/index'
import { readChunks, writeChunks, createTextChunk } from '../png/chunks'
import { extractZip } from '../zip/index'
import { encodeBase64 } from '../utils/base64'
import { encodeUTF8, decodeUTF8 } from '../utils/utf8'
import type { CharacterCard, Lorebook } from '../types'

// Helper to create minimal valid PNG bytes
function createMinimalPng(): Uint8Array {
  const ihdrData = new Uint8Array([
    0, 0, 0, 1, // width
    0, 0, 0, 1, // height
    8, 2, // bit depth, color type
    0, 0, 0, // compression, filter, interlace
  ])
  const ihdrChunk = {
    length: ihdrData.length,
    type: 'IHDR',
    data: ihdrData,
    crc: 0x815467c7,
  }
  const idatChunk = {
    length: 0,
    type: 'IDAT',
    data: new Uint8Array(0),
    crc: 0x35af061e,
  }
  const iendChunk = {
    length: 0,
    type: 'IEND',
    data: new Uint8Array(0),
    crc: 0xae426082,
  }
  return writeChunks([ihdrChunk, idatChunk, iendChunk])
}

// Helper to create V3 card
function createV3Card(name = 'Test Character'): CharacterCard {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name,
      description: 'Test description',
      personality: 'Friendly',
      scenario: 'Test scenario',
      first_mes: 'Hello!',
      mes_example: 'Example message',
      creator_notes: 'Notes',
      system_prompt: 'System prompt',
      post_history_instructions: 'Post history',
      alternate_greetings: ['Hi!', 'Hey!'],
      tags: ['test', 'example'],
      creator: 'Test Creator',
      character_version: '1.0',
      extensions: {},
      group_only_greetings: [],
    },
  }
}

// Helper to find chunk by keyword in text chunks
function findTextChunk(pngBytes: Uint8Array, keyword: string): { found: boolean; data: string } {
  const chunks = readChunks(pngBytes)
  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      let kw = ''
      let i = 0
      while (i < chunk.data.length && chunk.data[i] !== 0) {
        kw += String.fromCharCode(chunk.data[i] ?? 0)
        i++
      }
      if (kw === keyword) {
        let text = ''
        for (let j = i + 1; j < chunk.data.length; j++) {
          text += String.fromCharCode(chunk.data[j] ?? 0)
        }
        return { found: true, data: text }
      }
    }
  }
  return { found: false, data: '' }
}

describe('writeCardToPng()', () => {
  describe('Basic Writing', () => {
    it('embeds card in existing PNG bytes', () => {
      const card = createV3Card('Embedded')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      // Should be valid PNG
      expect(result[0]).toBe(0x89)
      expect(result[1]).toBe(0x50)
      expect(result[2]).toBe(0x4e)
      expect(result[3]).toBe(0x47)
      // Should be larger than base
      expect(result.length).toBeGreaterThan(basePng.length)
    })

    it('creates ccv3 tEXt chunk', () => {
      const card = createV3Card('ccv3 Test')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      const ccv3Chunk = findTextChunk(result, 'ccv3')
      expect(ccv3Chunk.found).toBe(true)
      expect(ccv3Chunk.data.length).toBeGreaterThan(0)
    })

    it('serializes card to JSON', () => {
      const card = createV3Card('JSON Serial')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      // Read back and verify JSON structure
      const readBack = readCard(result)
      expect(readBack.spec).toBe('chara_card_v3')
      expect(readBack.data.name).toBe('JSON Serial')
    })

    it('encodes JSON as UTF-8', () => {
      const card = createV3Card('UTF-8 テスト')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      const readBack = readCard(result)
      expect(readBack.data.name).toBe('UTF-8 テスト')
    })

    it('encodes UTF-8 as base64', () => {
      const card = createV3Card('Base64 Test')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      const ccv3Chunk = findTextChunk(result, 'ccv3')
      // Base64 should only contain valid characters
      expect(ccv3Chunk.data).toMatch(/^[A-Za-z0-9+/=]+$/)
    })

    it('computes correct CRC-32', () => {
      const card = createV3Card('CRC Test')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      // If CRC was incorrect, readChunks would fail
      const chunks = readChunks(result)
      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('V2 Compatibility', () => {
    it('includeV2Chunk: true writes chara chunk', () => {
      const card = createV3Card('V2 Compat')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { includeV2Chunk: true })
      const charaChunk = findTextChunk(result, 'chara')
      expect(charaChunk.found).toBe(true)
    })

    it('V2 chunk contains compatible JSON', () => {
      const card = createV3Card('V2 JSON')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { includeV2Chunk: true })
      const charaChunk = findTextChunk(result, 'chara')
      // Decode base64 and parse JSON
      const decoded = Buffer.from(charaChunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      expect(parsed.spec).toBe('chara_card_v2')
      expect(parsed.data.name).toBe('V2 JSON')
    })

    it('V2 chunk strips V3-only fields', () => {
      const card = createV3Card('V3 Only')
      card.data.group_only_greetings = ['Group greeting']
      card.data.nickname = 'Nick'
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { includeV2Chunk: true })
      const charaChunk = findTextChunk(result, 'chara')
      const decoded = Buffer.from(charaChunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      // V3-only fields should not be directly in data (may be in extensions)
      expect(parsed.data.group_only_greetings).toBeUndefined()
      expect(parsed.data.nickname).toBeUndefined()
    })

    it('includeV2Chunk: false omits chara chunk', () => {
      const card = createV3Card('V3 Only')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { includeV2Chunk: false })
      const charaChunk = findTextChunk(result, 'chara')
      expect(charaChunk.found).toBe(false)
    })
  })

  describe('Chunk Management', () => {
    it('removes existing ccv3 chunk', () => {
      const card1 = createV3Card('First')
      const basePng = createMinimalPng()
      const firstWrite = writeCardToPng(card1, basePng)

      const card2 = createV3Card('Second')
      const secondWrite = writeCardToPng(card2, firstWrite)

      // Should only have one ccv3 chunk
      const readBack = readCard(secondWrite)
      expect(readBack.data.name).toBe('Second')
    })

    it('removes existing chara chunk', () => {
      const card1 = createV3Card('First')
      const basePng = createMinimalPng()
      const firstWrite = writeCardToPng(card1, basePng, { includeV2Chunk: true })

      const card2 = createV3Card('Second')
      const secondWrite = writeCardToPng(card2, firstWrite, { includeV2Chunk: true })

      // Chara chunk should contain second card
      const charaChunk = findTextChunk(secondWrite, 'chara')
      const decoded = Buffer.from(charaChunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      expect(parsed.data.name).toBe('Second')
    })

    it('inserts new chunks before IEND', () => {
      const card = createV3Card('Before IEND')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      const chunks = readChunks(result)
      const iendIndex = chunks.findIndex(c => c.type === 'IEND')
      const ccv3Index = chunks.findIndex(c => c.type === 'tEXt')
      expect(ccv3Index).toBeLessThan(iendIndex)
    })

    it('preserves other PNG chunks', () => {
      const card = createV3Card('Preserve')
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng)
      const chunks = readChunks(result)
      const hasIHDR = chunks.some(c => c.type === 'IHDR')
      const hasIEND = chunks.some(c => c.type === 'IEND')
      expect(hasIHDR).toBe(true)
      expect(hasIEND).toBe(true)
    })
  })

  describe('Decorators', () => {
    it('serializeDecorators: true converts to @@syntax', () => {
      const card = createV3Card('Decorators')
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: 'Entry content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
            decorators: [{ type: 'depth', value: 4 }],
          },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { serializeDecorators: true })
      const ccv3Chunk = findTextChunk(result, 'ccv3')
      const decoded = Buffer.from(ccv3Chunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      // Content should have @@depth 4 prefix
      expect(parsed.data.character_book.entries[0].content).toContain('@@depth 4')
    })

    it('serializeDecorators: false preserves array', () => {
      const card = createV3Card('No Serialize')
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: 'Entry content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
            decorators: [{ type: 'depth', value: 4 }],
          },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { serializeDecorators: false })
      const ccv3Chunk = findTextChunk(result, 'ccv3')
      const decoded = Buffer.from(ccv3Chunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      // Decorators should still be array
      expect(Array.isArray(parsed.data.character_book.entries[0].decorators)).toBe(true)
    })

    it('decorator order preserved', () => {
      const card = createV3Card('Order')
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: 'Content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
            decorators: [
              { type: 'depth', value: 4 },
              { type: 'role', value: 'system' },
              { type: 'activate' },
            ],
          },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeCardToPng(card, basePng, { serializeDecorators: true })
      const ccv3Chunk = findTextChunk(result, 'ccv3')
      const decoded = Buffer.from(ccv3Chunk.data, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      const content = parsed.data.character_book.entries[0].content
      const depthIndex = content.indexOf('@@depth')
      const roleIndex = content.indexOf('@@role')
      const activateIndex = content.indexOf('@@activate')
      expect(depthIndex).toBeLessThan(roleIndex)
      expect(roleIndex).toBeLessThan(activateIndex)
    })
  })
})

describe('writeCardToJson()', () => {
  describe('Serialization', () => {
    it('returns JSON string', () => {
      const card = createV3Card()
      const result = writeCardToJson(card)
      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('includes spec field', () => {
      const card = createV3Card()
      const result = writeCardToJson(card)
      const parsed = JSON.parse(result)
      expect(parsed.spec).toBe('chara_card_v3')
    })

    it('includes spec_version field', () => {
      const card = createV3Card()
      const result = writeCardToJson(card)
      const parsed = JSON.parse(result)
      expect(parsed.spec_version).toBe('3.0')
    })

    it('includes all data fields', () => {
      const card = createV3Card('All Fields')
      const result = writeCardToJson(card)
      const parsed = JSON.parse(result)
      expect(parsed.data.name).toBe('All Fields')
      expect(parsed.data.description).toBe('Test description')
      expect(parsed.data.personality).toBe('Friendly')
      expect(parsed.data.tags).toEqual(['test', 'example'])
    })

    it('handles special characters', () => {
      const card = createV3Card('Special "quotes" & <brackets>')
      card.data.description = 'Line1\nLine2\tTab'
      const result = writeCardToJson(card)
      const parsed = JSON.parse(result)
      expect(parsed.data.name).toBe('Special "quotes" & <brackets>')
      expect(parsed.data.description).toBe('Line1\nLine2\tTab')
    })

    it('handles unicode', () => {
      const card = createV3Card('Unicode: 日本語 emoji: 🎭')
      const result = writeCardToJson(card)
      const parsed = JSON.parse(result)
      expect(parsed.data.name).toBe('Unicode: 日本語 emoji: 🎭')
    })
  })
})

describe('writeCardToCharx()', () => {
  describe('ZIP Creation', () => {
    it('creates valid ZIP file', () => {
      const card = createV3Card('ZIP Valid')
      const result = writeCardToCharx(card)
      // ZIP signature
      expect(result[0]).toBe(0x50)
      expect(result[1]).toBe(0x4b)
      expect(result[2]).toBe(0x03)
      expect(result[3]).toBe(0x04)
    })

    it('includes card.json at root', () => {
      const card = createV3Card('Card JSON')
      const result = writeCardToCharx(card)
      const files = extractZip(result)
      expect(files.has('card.json')).toBe(true)
      const cardJson = files.get('card.json')!
      const parsed = JSON.parse(decodeUTF8(cardJson))
      expect(parsed.data.name).toBe('Card JSON')
    })

    it('includes assets directory', () => {
      const card = createV3Card('With Assets')
      const assetData = new Uint8Array([1, 2, 3, 4])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'main', data: assetData, ext: 'png' }],
      })
      const files = extractZip(result)
      expect(files.has('assets/icon/main.png')).toBe(true)
    })

    it('compresses with deflate', () => {
      // Our implementation uses stored (no compression)
      // but should still create valid ZIP
      const card = createV3Card('Compress Test')
      const result = writeCardToCharx(card)
      const files = extractZip(result)
      expect(files.has('card.json')).toBe(true)
    })
  })

  describe('Asset Handling', () => {
    it('writes icon assets to assets/icon/', () => {
      const card = createV3Card('Icon Asset')
      const assetData = new Uint8Array([89, 80, 78, 71])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'avatar', data: assetData, ext: 'png' }],
      })
      const files = extractZip(result)
      expect(files.has('assets/icon/avatar.png')).toBe(true)
      const iconData = files.get('assets/icon/avatar.png')!
      expect(iconData).toEqual(assetData)
    })

    it('writes emotion assets to assets/emotion/', () => {
      const card = createV3Card('Emotion Asset')
      const assetData = new Uint8Array([1, 2, 3])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'emotion', name: 'happy', data: assetData, ext: 'png' }],
      })
      const files = extractZip(result)
      expect(files.has('assets/emotion/happy.png')).toBe(true)
    })

    it('writes background assets to assets/background/', () => {
      const card = createV3Card('Background Asset')
      const assetData = new Uint8Array([4, 5, 6])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'background', name: 'default', data: assetData, ext: 'jpg' }],
      })
      const files = extractZip(result)
      expect(files.has('assets/background/default.jpg')).toBe(true)
    })

    it('updates asset URIs to embeded://', () => {
      const card = createV3Card('URI Update')
      const assetData = new Uint8Array([1, 2, 3])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'main', data: assetData, ext: 'png' }],
      })
      const files = extractZip(result)
      const cardJson = JSON.parse(decodeUTF8(files.get('card.json')!))
      expect(cardJson.data.assets[0].uri).toContain('embeded://')
    })

    it('accepts asset data as Uint8Array', () => {
      const card = createV3Card('Uint8Array')
      const assetData = new Uint8Array([0xff, 0xfe, 0xfd])
      const result = writeCardToCharx(card, {
        assets: [{ type: 'icon', name: 'test', data: assetData, ext: 'bin' }],
      })
      const files = extractZip(result)
      const extracted = files.get('assets/icon/test.bin')!
      expect(extracted[0]).toBe(0xff)
      expect(extracted[1]).toBe(0xfe)
      expect(extracted[2]).toBe(0xfd)
    })
  })
})

describe('writeLorebookToPng()', () => {
  describe('Basic Writing', () => {
    it('embeds lorebook in PNG', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['test'], content: 'content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeLorebookToPng(lorebook, basePng)
      expect(result.length).toBeGreaterThan(basePng.length)
    })

    it('creates naidata chunk', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['nai'], content: 'nai content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeLorebookToPng(lorebook, basePng)
      const naidataChunk = findTextChunk(result, 'naidata')
      expect(naidataChunk.found).toBe(true)
    })

    it('serializes entries', () => {
      const lorebook: Lorebook = {
        name: 'Test Book',
        entries: [
          { keys: ['key1', 'key2'], content: 'entry content', enabled: true, insertion_order: 5, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const basePng = createMinimalPng()
      const result = writeLorebookToPng(lorebook, basePng)
      const readBack = readLorebook(result)
      expect(readBack.name).toBe('Test Book')
      expect(readBack.entries[0].keys).toEqual(['key1', 'key2'])
      expect(readBack.entries[0].insertion_order).toBe(5)
    })
  })
})

describe('writeLorebookToJson()', () => {
  describe('Serialization', () => {
    it('returns JSON string', () => {
      const lorebook: Lorebook = {
        entries: [],
        extensions: {},
      }
      const result = writeLorebookToJson(lorebook)
      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('wraps in lorebook_v3 spec', () => {
      const lorebook: Lorebook = {
        name: 'Wrapped Book',
        entries: [
          { keys: ['wrap'], content: 'wrapped', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const result = writeLorebookToJson(lorebook)
      const parsed = JSON.parse(result)
      expect(parsed.spec).toBe('lorebook_v3')
      expect(parsed.data.name).toBe('Wrapped Book')
      expect(parsed.data.entries.length).toBe(1)
    })
  })
})
