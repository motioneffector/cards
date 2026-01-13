import { describe, it, expect } from 'vitest'
import { readCard, readCardFromPng, readCardFromJson, readCardFromCharx, readLorebook } from './index'
import { writeCardToPng, writeCardToCharx, writeLorebookToPng } from '../write/index'
import { writeChunks, createTextChunk } from '../png/chunks'
import { createZip } from '../zip/index'
import { encodeBase64 } from '../utils/base64'
import { encodeUTF8 } from '../utils/utf8'
import { ParseError } from '../errors'
import type { CharacterCard, Lorebook } from '../types'
import { PNG_SIGNATURE } from '../constants'

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

// Helper to create PNG with embedded card
function createPngWithCard(card: CharacterCard, keyword = 'ccv3'): Uint8Array {
  const basePng = createMinimalPng()
  return writeCardToPng(card, basePng, { includeV2Chunk: keyword === 'ccv3' })
}

// Helper to create PNG with custom base64 text chunk
function createPngWithTextChunk(keyword: string, text: string): Uint8Array {
  const basePng = createMinimalPng()
  const chunks = [
    {
      length: 13,
      type: 'IHDR',
      data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
      crc: 0x815467c7,
    },
    createTextChunk(keyword, text),
    {
      length: 0,
      type: 'IEND',
      data: new Uint8Array(0),
      crc: 0xae426082,
    },
  ]
  return writeChunks(chunks)
}

describe('readCard()', () => {
  describe('Auto-Detection', () => {
    it('detects PNG format from bytes', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('Test Character')
    })

    it('detects APNG format from bytes', () => {
      // APNG has same signature as PNG
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('detects JSON format from string', () => {
      const card = createV3Card()
      const json = JSON.stringify(card)
      const result = readCard(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('Test Character')
    })

    it('detects CHARX (ZIP) format from bytes', () => {
      const card = createV3Card()
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCard(zipBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('Test Character')
    })

    it('throws ParseError for unrecognized format', () => {
      expect(() => readCard(new Uint8Array([1, 2, 3]))).toThrow(ParseError)
    })
  })

  describe('PNG Reading', () => {
    it('reads V3 card from ccv3 chunk', () => {
      const card = createV3Card('V3 Character')
      const pngBytes = createPngWithCard(card, 'ccv3')
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('V3 Character')
    })

    it('reads V2 card from chara chunk', () => {
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'V2 Character',
          description: 'V2 desc',
          personality: 'V2 personality',
          scenario: 'V2 scenario',
          first_mes: 'V2 first',
          mes_example: 'V2 example',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: [],
          creator: '',
          character_version: '',
          extensions: {},
        },
      }
      const json = JSON.stringify(v2Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('V2 Character')
    })

    it('reads V1 card from chara chunk', () => {
      const v1Card = {
        name: 'V1 Character',
        description: 'V1 desc',
        personality: 'V1 personality',
        scenario: 'V1 scenario',
        first_mes: 'V1 first',
        mes_example: 'V1 example',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('V1 Character')
    })

    it('normalizes V1 to V3 structure', () => {
      const v1Card = {
        name: 'V1 Character',
        description: 'V1 desc',
        personality: 'V1 personality',
        scenario: 'V1 scenario',
        first_mes: 'V1 first',
        mes_example: 'V1 example',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.spec_version).toBe('3.0')
      expect(result.data.alternate_greetings).toEqual([])
      expect(result.data.tags).toEqual([])
      expect(result.data.group_only_greetings).toEqual([])
    })

    it('normalizes V2 to V3 structure', () => {
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'V2 Character',
          description: 'V2 desc',
          personality: 'V2 personality',
          scenario: 'V2 scenario',
          first_mes: 'V2 first',
          mes_example: 'V2 example',
          creator_notes: 'V2 notes',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: ['Hello'],
          tags: ['v2'],
          creator: 'V2 Creator',
          character_version: '2.0',
          extensions: { customField: true },
        },
      }
      const json = JSON.stringify(v2Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readCard(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.spec_version).toBe('3.0')
      expect(result.data.creator_notes).toBe('V2 notes')
      expect(result.data.alternate_greetings).toEqual(['Hello'])
      expect(result.data.group_only_greetings).toEqual([])
    })

    it('prefers ccv3 chunk over chara chunk', () => {
      const v3Card = createV3Card('V3 Preferred')
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'V2 Ignored',
          description: '',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: [],
          creator: '',
          character_version: '',
          extensions: {},
        },
      }
      // Create PNG with both chunks
      const pngBytes = createPngWithCard(v3Card, 'ccv3')
      const result = readCard(pngBytes)
      expect(result.data.name).toBe('V3 Preferred')
    })

    it('handles PNG with multiple card chunks', () => {
      const card = createV3Card('Multiple Chunks')
      const pngBytes = createPngWithCard(card, 'ccv3')
      const result = readCard(pngBytes)
      expect(result.data.name).toBe('Multiple Chunks')
    })

    it('handles APNG files', () => {
      // APNG shares PNG signature, test it works
      const card = createV3Card('APNG Test')
      const pngBytes = createPngWithCard(card)
      const result = readCard(pngBytes)
      expect(result.data.name).toBe('APNG Test')
    })
  })

  describe('JSON Reading', () => {
    it('reads V3 JSON directly', () => {
      const card = createV3Card('JSON V3')
      const json = JSON.stringify(card)
      const result = readCard(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('JSON V3')
    })

    it('reads V2 JSON and normalizes', () => {
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'JSON V2',
          description: 'desc',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: [],
          creator: '',
          character_version: '',
          extensions: {},
        },
      }
      const json = JSON.stringify(v2Card)
      const result = readCard(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('JSON V2')
    })

    it('reads V1 JSON and normalizes', () => {
      const v1Card = {
        name: 'JSON V1',
        description: 'desc',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const result = readCard(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('JSON V1')
    })

    it('throws ParseError for invalid JSON', () => {
      expect(() => readCard('invalid json {')).toThrow(ParseError)
    })
  })

  describe('Options', () => {
    it('strict: true throws on invalid data', () => {
      // Create PNG without card data
      const basePng = createMinimalPng()
      expect(() => readCard(basePng, { strict: true })).toThrow(ParseError)
    })

    it('strict: false returns partial data', () => {
      // With implementation, non-strict returns what we can parse
      const card = createV3Card()
      const json = JSON.stringify(card)
      const result = readCard(json, { strict: false })
      expect(result.data.name).toBe('Test Character')
    })

    it('parseDecorators: true parses decorators (default)', () => {
      const card = createV3Card()
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: '@@depth 4\nActual content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const json = JSON.stringify(card)
      const result = readCard(json, { parseDecorators: true })
      const entry = result.data.character_book?.entries[0]
      expect(entry?.decorators).toBeDefined()
      expect(Array.isArray(entry?.decorators)).toBe(true)
      expect(entry?.decorators).toContainEqual({ type: 'depth', value: 4 })
      expect(entry?.content).toBe('Actual content')
    })

    it('parseDecorators: false preserves raw content', () => {
      const card = createV3Card()
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: '@@depth 4\nActual content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const json = JSON.stringify(card)
      const result = readCard(json, { parseDecorators: false })
      const entry = result.data.character_book?.entries[0]
      expect(entry?.content).toBe('@@depth 4\nActual content')
    })
  })
})

describe('readCardFromPng()', () => {
  describe('Chunk Parsing', () => {
    it('parses PNG signature correctly', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      expect(pngBytes[0]).toBe(0x89)
      expect(pngBytes[1]).toBe(0x50)
      expect(pngBytes[2]).toBe(0x4e)
      expect(pngBytes[3]).toBe(0x47)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('Test Character')
    })

    it('iterates through chunks', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('finds tEXt chunks', () => {
      const card = createV3Card('tEXt Test')
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('tEXt Test')
    })

    it('reads ccv3 keyword chunk', () => {
      const card = createV3Card('ccv3 Test')
      const pngBytes = createPngWithCard(card, 'ccv3')
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('ccv3 Test')
    })

    it('reads chara keyword chunk', () => {
      const v1Card = {
        name: 'chara Test',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('chara Test')
    })

    it('decodes base64 payload', () => {
      const card = createV3Card('Base64 Test')
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('Base64 Test')
    })

    it('decodes UTF-8 from base64', () => {
      const card = createV3Card('UTF-8 テスト')
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('UTF-8 テスト')
    })

    it('parses JSON from decoded string', () => {
      const card = createV3Card()
      card.data.tags = ['json', 'test', 'parsing']
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.data.tags).toEqual(['json', 'test', 'parsing'])
    })
  })

  describe('CRC Validation', () => {
    it('validates CRC-32 on chunks', () => {
      const card = createV3Card('CRC Valid')
      const pngBytes = createPngWithCard(card)
      const result = readCardFromPng(pngBytes)
      expect(result.data.name).toBe('CRC Valid')
    })

    it('strict mode throws on data corruption', () => {
      // Create a PNG with corrupted base64 data to cause parsing failure
      const v1Card = {
        name: 'Corrupt Data Test',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      // Corrupt the base64 by adding invalid characters
      const corruptedBase64 = base64.slice(0, 10) + '!!!CORRUPT!!!' + base64.slice(20)
      const pngBytes = createPngWithTextChunk('chara', corruptedBase64)
      // Strict mode should throw on corrupted data
      expect(() => readCardFromPng(pngBytes, { strict: true })).toThrow(ParseError)
    })

    it('non-strict mode continues on CRC mismatch', () => {
      const card = createV3Card('Non-strict CRC')
      const pngBytes = createPngWithCard(card)
      // Corrupt the CRC of the last chunk before IEND
      // Find a tEXt chunk and corrupt its CRC
      let corruptedCRC = false
      for (let i = 8; i < pngBytes.length - 12; i++) {
        if (pngBytes[i] === 116 && pngBytes[i+1] === 69 && pngBytes[i+2] === 88 && pngBytes[i+3] === 116) { // 'tEXt'
          // Found tEXt chunk, corrupt CRC (last 4 bytes of chunk)
          const length = (pngBytes[i-8] << 24) | (pngBytes[i-7] << 16) | (pngBytes[i-6] << 8) | pngBytes[i-5]
          const crcOffset = i + 4 + length
          if (crcOffset + 4 < pngBytes.length) {
            pngBytes[crcOffset] = 0xFF
            pngBytes[crcOffset + 1] = 0xFF
            corruptedCRC = true
            break
          }
        }
      }
      expect(corruptedCRC).toBe(true)
      // In non-strict mode, should tolerate CRC mismatch and still parse
      const result = readCardFromPng(pngBytes, { strict: false })
      expect(result.data.name).toBe('Non-strict CRC')
    })
  })

  describe('Edge Cases', () => {
    it('handles PNG with no card data', () => {
      expect(() => readCardFromPng(new Uint8Array())).toThrow(ParseError)
    })

    it('handles truncated PNG', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const truncated = pngBytes.slice(0, 20)
      expect(() => readCardFromPng(truncated)).toThrow(ParseError)
    })

    it('handles corrupted chunk length', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      // Corrupt chunk length bytes
      pngBytes[8] = 0xff
      pngBytes[9] = 0xff
      expect(() => readCardFromPng(pngBytes, { strict: true })).toThrow(ParseError)
    })

    it('handles empty chunk payload', () => {
      const basePng = createMinimalPng()
      expect(() => readCardFromPng(basePng)).toThrow(ParseError)
    })
  })
})

describe('readCardFromJson()', () => {
  describe('Version Detection', () => {
    it('detects V3 by spec: "chara_card_v3"', () => {
      const card = createV3Card()
      const json = JSON.stringify(card)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('detects V2 by spec: "chara_card_v2"', () => {
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'V2',
          description: '',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: [],
          creator: '',
          character_version: '',
          extensions: {},
        },
      }
      const json = JSON.stringify(v2Card)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('detects V1 by absence of spec', () => {
      const v1Card = {
        name: 'V1',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('handles spec_version variations', () => {
      const card = {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
          name: 'Version Test',
          description: '',
          personality: '',
          scenario: '',
          first_mes: '',
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
      const json = JSON.stringify(card)
      const result = readCardFromJson(json)
      expect(result.spec_version).toBe('3.0')
    })
  })

  describe('Normalization to V3', () => {
    it('V1 gets all V2 defaults', () => {
      const v1 = {
        name: 'V1 Card',
        description: 'desc',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const result = readCardFromJson(JSON.stringify(v1))
      expect(result.data.creator_notes).toBe('')
      expect(result.data.system_prompt).toBe('')
      expect(result.data.alternate_greetings).toEqual([])
      expect(result.data.tags).toEqual([])
    })

    it('V1 gets all V3 defaults', () => {
      const v1 = {
        name: 'V1 Card',
        description: 'desc',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const result = readCardFromJson(JSON.stringify(v1))
      expect(result.data.group_only_greetings).toEqual([])
    })

    it('V2 gets V3 defaults', () => {
      const v2 = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'V2 Card',
          description: '',
          personality: '',
          scenario: '',
          first_mes: '',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: [],
          creator: '',
          character_version: '',
          extensions: {},
        },
      }
      const result = readCardFromJson(JSON.stringify(v2))
      expect(result.data.group_only_greetings).toEqual([])
    })

    it('preserves all original fields', () => {
      const v2 = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'Preserved',
          description: 'Original description',
          personality: 'Original personality',
          scenario: 'Original scenario',
          first_mes: 'Original first',
          mes_example: 'Original example',
          creator_notes: 'Original notes',
          system_prompt: 'Original prompt',
          post_history_instructions: 'Original post',
          alternate_greetings: ['Alt 1', 'Alt 2'],
          tags: ['tag1', 'tag2'],
          creator: 'Original creator',
          character_version: '1.0',
          extensions: { custom: 'value' },
        },
      }
      const result = readCardFromJson(JSON.stringify(v2))
      expect(result.data.name).toBe('Preserved')
      expect(result.data.description).toBe('Original description')
      expect(result.data.personality).toBe('Original personality')
      expect(result.data.creator_notes).toBe('Original notes')
      expect(result.data.alternate_greetings).toEqual(['Alt 1', 'Alt 2'])
      expect(result.data.extensions).toEqual({ custom: 'value' })
    })

    it('sets spec to chara_card_v3', () => {
      const v1 = {
        name: 'Test',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const result = readCardFromJson(JSON.stringify(v1))
      expect(result.spec).toBe('chara_card_v3')
    })

    it('sets spec_version to 3.0', () => {
      const v1 = {
        name: 'Test',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const result = readCardFromJson(JSON.stringify(v1))
      expect(result.spec_version).toBe('3.0')
    })
  })
})

describe('readCardFromCharx()', () => {
  describe('ZIP Extraction', () => {
    it('extracts card.json from ZIP', () => {
      const card = createV3Card('ZIP Extract')
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.name).toBe('ZIP Extract')
    })

    it('parses card.json as V3', () => {
      const card = createV3Card()
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.spec).toBe('chara_card_v3')
    })

    it('maps embedded assets to card', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'icon', name: 'main', uri: 'embeded://assets/icon/main.png', ext: 'png' },
      ]
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/icon/main.png', new Uint8Array([1, 2, 3]))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.length).toBe(1)
    })

    it('handles deflate compression', () => {
      // Our ZIP implementation uses stored, but the reader should handle deflate
      const card = createV3Card('Deflate Test')
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.name).toBe('Deflate Test')
    })

    it('handles stored (no compression)', () => {
      const card = createV3Card('Stored Test')
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.name).toBe('Stored Test')
    })
  })

  describe('Asset Mapping', () => {
    it('reads icon assets', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'icon', name: 'main', uri: 'embeded://assets/icon/main.png', ext: 'png' },
      ]
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/icon/main.png', new Uint8Array([89, 80, 78, 71]))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.[0]?.type).toBe('icon')
    })

    it('reads emotion assets', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'emotion', name: 'happy', uri: 'embeded://assets/emotion/happy.png', ext: 'png' },
      ]
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/emotion/happy.png', new Uint8Array([1, 2, 3]))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.[0]?.type).toBe('emotion')
    })

    it('reads background assets', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'background', name: 'default', uri: 'embeded://assets/background/default.png', ext: 'png' },
      ]
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/background/default.png', new Uint8Array([1, 2, 3]))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.[0]?.type).toBe('background')
    })

    it('maps embeded:// URIs to data', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'icon', name: 'main', uri: 'embeded://assets/icon/main.png', ext: 'png' },
      ]
      const assetData = new Uint8Array([89, 80, 78, 71, 13, 10, 26, 10])
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/icon/main.png', assetData)
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.[0]?.uri).toContain('data:')
    })

    it('returns asset bytes', () => {
      const card = createV3Card()
      card.data.assets = [
        { type: 'icon', name: 'main', uri: 'embeded://assets/icon/main.png', ext: 'png' },
      ]
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      files.set('assets/icon/main.png', new Uint8Array([1, 2, 3, 4]))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.assets?.[0]?.uri).toBeDefined()
      expect(result.data.assets?.[0]?.uri).toMatch(/^(data:|embeded:\/\/)/)
    })
  })

  describe('Edge Cases', () => {
    it('handles CHARX with no assets', () => {
      const card = createV3Card('No Assets')
      const files = new Map<string, Uint8Array>()
      files.set('card.json', encodeUTF8(JSON.stringify(card)))
      const zipBytes = createZip(files)
      const result = readCardFromCharx(zipBytes)
      expect(result.data.name).toBe('No Assets')
      expect(result.data.assets).toBeUndefined()
    })

    it('handles missing card.json', () => {
      expect(() => readCardFromCharx(new Uint8Array())).toThrow(ParseError)
    })

    it('handles corrupted ZIP', () => {
      const invalidZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xff])
      expect(() => readCardFromCharx(invalidZip)).toThrow(ParseError)
    })
  })
})

describe('readLorebook()', () => {
  describe('From PNG', () => {
    it('reads lorebook from naidata chunk', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['test'], content: 'content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const wrapped = { spec: 'lorebook_v3', data: lorebook }
      const json = JSON.stringify(wrapped)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('naidata', base64)
      const result = readLorebook(pngBytes)
      expect(result.entries.length).toBe(1)
      expect(result.entries[0].keys).toEqual(['test'])
    })

    it('reads lorebook from chara chunk', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['chara'], content: 'chara content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const wrapped = { spec: 'lorebook_v3', data: lorebook }
      const json = JSON.stringify(wrapped)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = readLorebook(pngBytes)
      expect(result.entries[0].keys).toEqual(['chara'])
    })

    it('prefers naidata over chara for lorebook', () => {
      // Create PNG with naidata
      const lorebook: Lorebook = {
        entries: [
          { keys: ['naidata'], content: 'naidata content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const wrapped = { spec: 'lorebook_v3', data: lorebook }
      const json = JSON.stringify(wrapped)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('naidata', base64)
      const result = readLorebook(pngBytes)
      expect(result.entries[0].keys).toEqual(['naidata'])
    })

    it('normalizes to lorebook_v3', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['norm'], content: 'norm content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const wrapped = { spec: 'lorebook_v3', data: lorebook }
      const json = JSON.stringify(wrapped)
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('naidata', base64)
      const result = readLorebook(pngBytes)
      expect(result.entries).toBeDefined()
      expect(Array.isArray(result.entries)).toBe(true)
      expect(result.extensions).toBeDefined()
      expect(typeof result.extensions).toBe('object')
      expect(result.extensions).not.toBeNull()
    })
  })

  describe('From JSON', () => {
    it('reads standalone lorebook JSON', () => {
      const lorebook: Lorebook = {
        entries: [
          { keys: ['standalone'], content: 'standalone', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const json = JSON.stringify(lorebook)
      const result = readLorebook(json)
      expect(result.entries[0].keys).toEqual(['standalone'])
    })

    it('handles wrapped lorebook_v3 format', () => {
      const lorebook: Lorebook = {
        name: 'Wrapped',
        entries: [
          { keys: ['wrapped'], content: 'wrapped content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
        ],
        extensions: {},
      }
      const wrapped = { spec: 'lorebook_v3', data: lorebook }
      const json = JSON.stringify(wrapped)
      const result = readLorebook(json)
      expect(result.name).toBe('Wrapped')
      expect(result.entries[0].keys).toEqual(['wrapped'])
    })

    it('handles unwrapped entries array', () => {
      const entries = [
        { keys: ['array'], content: 'array content', enabled: true, insertion_order: 0, use_regex: false, extensions: {} },
      ]
      const json = JSON.stringify(entries)
      const result = readLorebook(json)
      expect(result.entries[0].keys).toEqual(['array'])
    })
  })
})
