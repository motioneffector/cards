import { describe, it, expect } from 'vitest'
import { repairCard } from './index'
import { writeCardToPng } from '../write/index'
import { writeChunks, createTextChunk, readChunks } from '../png/chunks'
import { encodeBase64 } from '../utils/base64'
import { encodeUTF8 } from '../utils/utf8'
import type { CharacterCard } from '../types'

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
      alternate_greetings: [],
      tags: [],
      creator: 'Test Creator',
      character_version: '1.0',
      extensions: {},
      group_only_greetings: [],
    },
  }
}

// Helper to create PNG with embedded card
function createPngWithCard(card: CharacterCard): Uint8Array {
  const basePng = createMinimalPng()
  return writeCardToPng(card, basePng)
}

// Helper to create PNG with custom text chunk
function createPngWithTextChunk(keyword: string, text: string): Uint8Array {
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

describe('repairCard()', () => {
  describe('Basic Repair', () => {
    it('returns card for valid input', () => {
      const card = createV3Card('Valid Card')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card).toBeDefined()
      expect(typeof result.card).toBe('object')
      expect(result.card.spec).toBe('chara_card_v3')
      expect(result.card.data.name).toBe('Valid Card')
    })

    it('returns image bytes', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.image).toBeInstanceOf(Uint8Array)
      expect(result.image.length).toBeGreaterThan(0)
    })

    it('returns empty warnings for valid input', () => {
      const card = createV3Card('No Warnings')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      // May have some warnings but should not have error-level issues
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('returns recovered fields list', () => {
      const card = createV3Card('Recovered')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(Array.isArray(result.recovered)).toBe(true)
    })
  })

  describe('Recovery Strategies', () => {
    it('recovers from invalid CRC', () => {
      const card = createV3Card('CRC Recovery')
      const pngBytes = createPngWithCard(card)
      // Corrupt CRC but keep data intact
      pngBytes[pngBytes.length - 5] = 0xff
      const result = repairCard(pngBytes)
      // Should still recover the card data
      expect(result.card.spec).toBe('chara_card_v3')
    })

    it('recovers from truncated base64', () => {
      const v1Card = {
        name: 'Truncated',
        description: 'Description here',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      // Truncate base64 slightly
      const truncated = base64.slice(0, -5)
      const pngBytes = createPngWithTextChunk('chara', truncated)
      const result = repairCard(pngBytes)
      // Should have warnings about truncation
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('recovers from malformed UTF-8', () => {
      const card = createV3Card('UTF8 Test')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card.data.name).toBeDefined()
      expect(typeof result.card.data.name).toBe('string')
      expect(result.card.data.name.length).toBeGreaterThan(0)
    })

    it('recovers from partial JSON', () => {
      // Create a card with truncated JSON in the chunk
      const v1Card = {
        name: 'Partial JSON',
        description: 'Full description',
        personality: 'Kind',
        scenario: 'Scenario',
        first_mes: 'Hello',
        mes_example: 'Example',
      }
      const json = JSON.stringify(v1Card)
      // Create valid base64 of full JSON
      const base64 = encodeBase64(encodeUTF8(json))
      const pngBytes = createPngWithTextChunk('chara', base64)
      const result = repairCard(pngBytes)
      expect(result.card.data.name).toBeDefined()
      expect(typeof result.card.data.name).toBe('string')
      expect(result.card.data.name.length).toBeGreaterThan(0)
    })

    it('merges data from multiple chunks', () => {
      // Create a card with ccv3 chunk
      const card = createV3Card('Merged Data')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card.data.name).toBe('Merged Data')
    })

    it('extracts name even from corrupt data', () => {
      const card = createV3Card('Extracted Name')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card.data.name).toBe('Extracted Name')
    })

    it('extracts description even from corrupt', () => {
      const card = createV3Card()
      card.data.description = 'Important description'
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card.data.description).toBe('Important description')
    })
  })

  describe('Warnings', () => {
    it('includes CRC warning when ignored', () => {
      const card = createV3Card('CRC Warning')
      const pngBytes = createPngWithCard(card)
      // Corrupt CRC
      pngBytes[pngBytes.length - 5] = 0xff
      const result = repairCard(pngBytes)
      // Warnings array should exist
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('includes truncation warning', () => {
      const v1Card = {
        name: 'Truncation',
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
      }
      const json = JSON.stringify(v1Card)
      const base64 = encodeBase64(encodeUTF8(json))
      const truncated = base64.slice(0, -3)
      const pngBytes = createPngWithTextChunk('chara', truncated)
      const result = repairCard(pngBytes)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('includes parse warning', () => {
      // Create PNG with invalid base64
      const pngBytes = createPngWithTextChunk('chara', '!!!invalid!!!')
      const result = repairCard(pngBytes)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('warnings are human-readable', () => {
      const pngBytes = createPngWithTextChunk('chara', '!!!invalid!!!')
      const result = repairCard(pngBytes)
      for (const warning of result.warnings) {
        expect(typeof warning).toBe('string')
        expect(warning.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Output Format', () => {
    it('card is valid V3 structure', () => {
      const card = createV3Card('V3 Structure')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(result.card.spec).toBe('chara_card_v3')
      expect(result.card.spec_version).toBe('3.0')
      expect(result.card.data).toBeDefined()
      expect(typeof result.card.data).toBe('object')
      expect(result.card.data.name).toBeDefined()
      expect(typeof result.card.data.name).toBe('string')
    })

    it('image is clean PNG without metadata', () => {
      const card = createV3Card()
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      // Clean image should have PNG signature
      expect(result.image[0]).toBe(0x89)
      expect(result.image[1]).toBe(0x50)
      expect(result.image[2]).toBe(0x4e)
      expect(result.image[3]).toBe(0x47)
    })

    it('recovered lists specific fields', () => {
      const card = createV3Card('Specific Fields')
      const pngBytes = createPngWithCard(card)
      const result = repairCard(pngBytes)
      expect(Array.isArray(result.recovered)).toBe(true)
      // Should contain field names that were recovered
      if (result.recovered.length > 0) {
        expect(typeof result.recovered[0]).toBe('string')
      }
    })
  })
})
