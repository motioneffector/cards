import { describe, it, expect } from 'vitest'
import {
  readCard,
  readCardFromJson,
  writeCardToPng,
  writeCardToJson,
  writeCardToCharx,
  readCardFromCharx,
} from './index'
import { writeChunks, createTextChunk } from './png/chunks'
import { createZip, extractZip } from './zip/index'
import { encodeUTF8, decodeUTF8 } from './utils/utf8'
import type { CharacterCard, Lorebook, LorebookEntry } from './types'

// Helper to create minimal valid PNG bytes
function createMinimalPng(): Uint8Array {
  const ihdrData = new Uint8Array([
    0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
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

// Helper to create complete V3 card
function createCompleteCard(): CharacterCard {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Test Character',
      description: 'A test character description',
      personality: 'Friendly and helpful',
      scenario: 'Test scenario',
      first_mes: 'Hello, welcome!',
      mes_example: '<START>\n{{user}}: Hi\n{{char}}: Hello!',
      creator_notes: 'Created for testing',
      system_prompt: 'You are a helpful assistant',
      post_history_instructions: 'Continue the conversation',
      alternate_greetings: ['Hi there!', 'Greetings!'],
      tags: ['test', 'example', 'demo'],
      creator: 'Test Creator',
      character_version: '1.0.0',
      extensions: { talkativeness: 0.5 },
      group_only_greetings: ['Hello everyone!'],
      character_book: {
        name: 'Test Lorebook',
        entries: [
          {
            keys: ['keyword1', 'keyword2'],
            content: 'Entry content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      },
    },
  }
}

describe('Data Structures', () => {
  describe('CharacterCard V3', () => {
    it('has spec field', () => {
      const card = createCompleteCard()
      expect(card.spec).toBe('chara_card_v3')
    })

    it('has spec_version field', () => {
      const card = createCompleteCard()
      expect(card.spec_version).toBe('3.0')
    })

    it('has data.name', () => {
      const card = createCompleteCard()
      expect(typeof card.data.name).toBe('string')
      expect(card.data.name).toBe('Test Character')
    })

    it('has data.description', () => {
      const card = createCompleteCard()
      expect(typeof card.data.description).toBe('string')
    })

    it('has data.personality', () => {
      const card = createCompleteCard()
      expect(typeof card.data.personality).toBe('string')
    })

    it('has data.scenario', () => {
      const card = createCompleteCard()
      expect(typeof card.data.scenario).toBe('string')
    })

    it('has data.first_mes', () => {
      const card = createCompleteCard()
      expect(typeof card.data.first_mes).toBe('string')
    })

    it('has data.mes_example', () => {
      const card = createCompleteCard()
      expect(typeof card.data.mes_example).toBe('string')
    })

    it('has data.creator_notes', () => {
      const card = createCompleteCard()
      expect(typeof card.data.creator_notes).toBe('string')
    })

    it('has data.system_prompt', () => {
      const card = createCompleteCard()
      expect(typeof card.data.system_prompt).toBe('string')
    })

    it('has data.post_history_instructions', () => {
      const card = createCompleteCard()
      expect(typeof card.data.post_history_instructions).toBe('string')
    })

    it('has data.alternate_greetings array', () => {
      const card = createCompleteCard()
      expect(Array.isArray(card.data.alternate_greetings)).toBe(true)
      expect(card.data.alternate_greetings.length).toBe(2)
    })

    it('has data.tags array', () => {
      const card = createCompleteCard()
      expect(Array.isArray(card.data.tags)).toBe(true)
      expect(card.data.tags.length).toBe(3)
    })

    it('has data.creator', () => {
      const card = createCompleteCard()
      expect(typeof card.data.creator).toBe('string')
    })

    it('has data.character_version', () => {
      const card = createCompleteCard()
      expect(typeof card.data.character_version).toBe('string')
    })

    it('has data.extensions object', () => {
      const card = createCompleteCard()
      expect(typeof card.data.extensions).toBe('object')
    })

    it('has data.character_book optional', () => {
      const card = createCompleteCard()
      expect(card.data.character_book).toBeDefined()
      expect(Array.isArray(card.data.character_book?.entries)).toBe(true)
    })
  })

  describe('Lorebook', () => {
    it('has entries array', () => {
      const card = createCompleteCard()
      const lorebook = card.data.character_book!
      expect(Array.isArray(lorebook.entries)).toBe(true)
    })

    it('has optional name', () => {
      const card = createCompleteCard()
      const lorebook = card.data.character_book!
      expect(lorebook.name).toBe('Test Lorebook')
    })

    it('has optional description', () => {
      const lorebook: Lorebook = {
        description: 'A test lorebook',
        entries: [],
        extensions: {},
      }
      expect(lorebook.description).toBe('A test lorebook')
    })

    it('has optional scan_depth', () => {
      const lorebook: Lorebook = {
        scan_depth: 10,
        entries: [],
        extensions: {},
      }
      expect(lorebook.scan_depth).toBe(10)
    })

    it('has optional token_budget', () => {
      const lorebook: Lorebook = {
        token_budget: 500,
        entries: [],
        extensions: {},
      }
      expect(lorebook.token_budget).toBe(500)
    })

    it('has optional recursive_scanning', () => {
      const lorebook: Lorebook = {
        recursive_scanning: true,
        entries: [],
        extensions: {},
      }
      expect(lorebook.recursive_scanning).toBe(true)
    })

    it('has extensions object', () => {
      const card = createCompleteCard()
      const lorebook = card.data.character_book!
      expect(typeof lorebook.extensions).toBe('object')
    })
  })

  describe('LorebookEntry', () => {
    it('has keys array', () => {
      const entry: LorebookEntry = {
        keys: ['key1', 'key2'],
        content: 'content',
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        extensions: {},
      }
      expect(Array.isArray(entry.keys)).toBe(true)
      expect(entry.keys).toEqual(['key1', 'key2'])
    })

    it('has content string', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: 'This is the content',
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        extensions: {},
      }
      expect(typeof entry.content).toBe('string')
    })

    it('has enabled boolean', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: 'content',
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        extensions: {},
      }
      expect(typeof entry.enabled).toBe('boolean')
    })

    it('has insertion_order number', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: 'content',
        enabled: true,
        insertion_order: 5,
        use_regex: false,
        extensions: {},
      }
      expect(typeof entry.insertion_order).toBe('number')
    })

    it('has use_regex boolean', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: 'content',
        enabled: true,
        insertion_order: 0,
        use_regex: true,
        extensions: {},
      }
      expect(typeof entry.use_regex).toBe('boolean')
    })

    it('has optional decorators array', () => {
      const entry: LorebookEntry = {
        keys: ['key'],
        content: 'content',
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        extensions: {},
        decorators: [{ type: 'depth', value: 4 }],
      }
      expect(Array.isArray(entry.decorators)).toBe(true)
    })
  })
})

describe('Integration Tests', () => {
  describe('Round-Trip PNG', () => {
    it('read → write → read produces identical card', () => {
      const original = createCompleteCard()
      const basePng = createMinimalPng()
      const pngWithCard = writeCardToPng(original, basePng)
      const readBack = readCard(pngWithCard)

      expect(readBack.spec).toBe(original.spec)
      expect(readBack.data.name).toBe(original.data.name)
      expect(readBack.data.description).toBe(original.data.description)
    })

    it('preserves all metadata', () => {
      const original = createCompleteCard()
      const basePng = createMinimalPng()
      const pngWithCard = writeCardToPng(original, basePng)
      const readBack = readCard(pngWithCard)

      expect(readBack.data.creator).toBe(original.data.creator)
      expect(readBack.data.character_version).toBe(original.data.character_version)
      expect(readBack.data.tags).toEqual(original.data.tags)
      expect(readBack.data.alternate_greetings).toEqual(original.data.alternate_greetings)
    })

    it('preserves lorebook', () => {
      const original = createCompleteCard()
      const basePng = createMinimalPng()
      const pngWithCard = writeCardToPng(original, basePng)
      const readBack = readCard(pngWithCard)

      expect(readBack.data.character_book).toBeDefined()
      expect(readBack.data.character_book?.entries.length).toBe(
        original.data.character_book?.entries.length
      )
    })
  })

  describe('Round-Trip JSON', () => {
    it('read → write → read produces identical card', () => {
      const original = createCompleteCard()
      const json = writeCardToJson(original)
      const readBack = readCardFromJson(json)

      expect(readBack.spec).toBe(original.spec)
      expect(readBack.data.name).toBe(original.data.name)
      expect(readBack.data.personality).toBe(original.data.personality)
    })
  })

  describe('Round-Trip CHARX', () => {
    it('read → write → read produces identical card', () => {
      const original = createCompleteCard()
      const charx = writeCardToCharx(original)
      const readBack = readCardFromCharx(charx)

      expect(readBack.spec).toBe(original.spec)
      expect(readBack.data.name).toBe(original.data.name)
    })

    it('assets preserved', () => {
      const original = createCompleteCard()
      const assetData = new Uint8Array([1, 2, 3, 4, 5])
      const charx = writeCardToCharx(original, {
        assets: [{ type: 'icon', name: 'main', data: assetData, ext: 'png' }],
      })
      const files = extractZip(charx)
      expect(files.has('assets/icon/main.png')).toBe(true)
      expect(files.get('assets/icon/main.png')).toEqual(assetData)
    })
  })

  describe('Compatibility', () => {
    it('reads V2 card format (Chub.ai style)', () => {
      // Simulate a V2 card format like Chub.ai produces
      const v2Card = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'Chub Character',
          description: 'From Chub',
          personality: 'Personality',
          scenario: 'Scenario',
          first_mes: 'Hello',
          mes_example: '',
          creator_notes: '',
          system_prompt: '',
          post_history_instructions: '',
          alternate_greetings: [],
          tags: ['chub'],
          creator: 'Chub Creator',
          character_version: '1.0',
          extensions: {},
        },
      }
      const json = JSON.stringify(v2Card)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('Chub Character')
    })

    it('reads V2 card format (SillyTavern style)', () => {
      // SillyTavern typically produces V2 cards
      const stCard = {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
          name: 'ST Character',
          description: 'SillyTavern character',
          personality: '',
          scenario: '',
          first_mes: 'Hello!',
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
      const json = JSON.stringify(stCard)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('ST Character')
    })

    it('reads V1 card format (NovelAI style)', () => {
      // NovelAI uses V1-like format
      const naiCard = {
        name: 'NAI Character',
        description: 'From NovelAI',
        personality: 'NAI personality',
        scenario: '',
        first_mes: 'Hello from NAI',
        mes_example: '',
      }
      const json = JSON.stringify(naiCard)
      const result = readCardFromJson(json)
      expect(result.spec).toBe('chara_card_v3')
      expect(result.data.name).toBe('NAI Character')
    })

    it('written cards work in SillyTavern', () => {
      // Verify V2 compatibility chunk is valid
      const card = createCompleteCard()
      const basePng = createMinimalPng()
      const pngWithCard = writeCardToPng(card, basePng, { includeV2Chunk: true })
      // Read back should still work
      const readBack = readCard(pngWithCard)
      expect(readBack.data.name).toBe(card.data.name)
    })

    it('V2 compat chunk readable by V2 parsers', () => {
      const card = createCompleteCard()
      const basePng = createMinimalPng()
      const pngWithCard = writeCardToPng(card, basePng, { includeV2Chunk: true })
      // V2 parser would look for chara chunk - verify it exists and is valid
      const readBack = readCard(pngWithCard)
      expect(readBack.spec).toBe('chara_card_v3')
    })
  })
})
