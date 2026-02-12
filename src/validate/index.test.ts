import { describe, it, expect } from 'vitest'
import { validateCard, validateLorebook } from './index'
import type { CharacterCard, Lorebook } from '../types'

// Helper to create valid card
function createValidCard(): CharacterCard {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: 'Test',
      description: 'Test desc',
      personality: 'Friendly',
      scenario: 'Test scenario',
      first_mes: 'Hello',
      mes_example: 'Example',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: 'Test',
      character_version: '1.0',
      extensions: {},
      group_only_greetings: [],
    },
  }
}

describe('validateCard()', () => {
  describe('Permissive Mode (default)', () => {
    it('returns valid: true for valid card', () => {
      const card = createValidCard()
      const result = validateCard(card)
      expect(result.valid).toBe(true)
    })

    it('returns valid: false for missing name', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).name = undefined
      const result = validateCard(card)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.match(/name/i))).toBe(true)
    })

    it('returns valid: false for missing description', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).description = undefined
      const result = validateCard(card)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.match(/description/i))).toBe(true)
    })

    it('returns valid: false for wrong type', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).name = 123 // Should be string
      const result = validateCard(card)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('string'))).toBe(true)
    })

    it('allows unknown fields', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).customField = 'custom value'
      const result = validateCard(card)
      expect(result.valid).toBe(true)
    })

    it('allows missing optional fields', () => {
      const card = createValidCard()
      delete (card.data as Record<string, unknown>).nickname
      delete (card.data as Record<string, unknown>).creation_date
      const result = validateCard(card)
      expect(result.valid).toBe(true)
    })
  })

  describe('Strict Mode', () => {
    it('warns on unknown extension keys', () => {
      const card = createValidCard()
      card.data.extensions = { unknownKey: 'value' }
      const result = validateCard(card, { strict: true })
      expect(result.errors?.some(e => e.includes('unknown extension'))).toBe(true)
    })

    it('warns on empty required strings', () => {
      const card = createValidCard()
      card.data.name = ''
      const result = validateCard(card, { strict: true })
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('empty'))).toBe(true)
    })

    it('validates decorator syntax', () => {
      const card = createValidCard()
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: 'content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
            decorators: [{ type: 'depth', value: 4 }],
          },
        ],
        extensions: {},
      }
      const result = validateCard(card, { strict: true })
      // Valid decorator should not cause error
      const hasDecoratorError = result.errors?.some(e => e.includes('decorator')) === true
      expect(hasDecoratorError).toBe(false)
    })

    it('validates asset URIs', () => {
      const card = createValidCard()
      card.data.assets = [
        { type: 'icon', name: 'main', uri: 'invalid-uri', ext: 'png' },
      ]
      const result = validateCard(card, { strict: true })
      expect(result.errors?.some(e => e.includes('uri') || e.includes('URI'))).toBe(true)
    })

    it('checks lorebook entry consistency', () => {
      const card = createValidCard()
      card.data.character_book = {
        entries: [
          {
            keys: ['test'],
            content: 'content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const result = validateCard(card, { strict: true })
      // Valid lorebook should pass - errors may be undefined or empty
      const hasLorebookError = result.errors?.some(e => e.includes('lorebook')) === true
      expect(hasLorebookError).toBe(false)
    })
  })

  describe('Error Details', () => {
    it('errors array describes each issue', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).name = undefined
      ;(card.data as Record<string, unknown>).description = undefined
      const result = validateCard(card)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThanOrEqual(2)
      expect(result.errors![0]).toMatch(/.+/)
      expect(result.errors![1]).toMatch(/.+/)
    })

    it('errors include field path', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).name = 123
      const result = validateCard(card)
      expect(result.errors?.some(e => e.includes('data.name'))).toBe(true)
    })

    it('errors include expected type', () => {
      const card = createValidCard()
      ;(card.data as Record<string, unknown>).name = 123
      const result = validateCard(card)
      expect(result.errors?.some(e => e.includes('string'))).toBe(true)
    })
  })
})

describe('validateLorebook()', () => {
  describe('Basic Validation', () => {
    it('returns valid: true for valid lorebook', () => {
      const lorebook: Lorebook = {
        entries: [
          {
            keys: ['test'],
            content: 'content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(true)
    })

    it('returns valid: false for missing entries', () => {
      const lorebook = { extensions: {} } as unknown
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('entries'))).toBe(true)
    })

    it('returns valid: false for invalid entry', () => {
      const lorebook = {
        entries: [
          { invalid: 'entry' },
        ],
        extensions: {},
      }
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(false)
    })

    it('validates keys array', () => {
      const lorebook = {
        entries: [
          {
            keys: 'not-an-array',
            content: 'content',
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('keys'))).toBe(true)
    })

    it('validates content string', () => {
      const lorebook = {
        entries: [
          {
            keys: ['test'],
            content: 123,
            enabled: true,
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('content'))).toBe(true)
    })

    it('validates enabled boolean', () => {
      const lorebook = {
        entries: [
          {
            keys: ['test'],
            content: 'content',
            enabled: 'yes',
            insertion_order: 0,
            use_regex: false,
            extensions: {},
          },
        ],
        extensions: {},
      }
      const result = validateLorebook(lorebook)
      expect(result.valid).toBe(false)
      expect(result.errors?.some(e => e.includes('enabled'))).toBe(true)
    })
  })
})
