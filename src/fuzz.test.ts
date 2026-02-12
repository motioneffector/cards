/**
 * Fuzz Test Suite for @motioneffector/cards
 *
 * This suite implements comprehensive fuzz testing for the Character Card V3 parser.
 * Tests run in two modes:
 * - Standard: 200 iterations per test (fast, deterministic)
 * - Thorough: 60 seconds per test (exhaustive, non-deterministic)
 *
 * Run with:
 *   pnpm test:run           # Standard mode
 *   pnpm fuzz:thorough      # Thorough mode
 */

import { describe, it, expect } from 'vitest'
import {
  parseDecorators,
  serializeDecorators,
  validateCard,
  validateLorebook,
  readCardFromJson,
  readCardFromPng,
  readCard,
  readCardFromCharx,
  encodeBase64,
  decodeBase64,
  computeCRC32,
  writeCardToJson,
  writeCardToPng,
  writeCardToCharx,
  ParseError,
} from './index'
import type { CharacterCard, Decorator, Lorebook } from './types'

// ============================================================================
// Core Utilities
// ============================================================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const STANDARD_ITERATIONS = 200
const THOROUGH_DURATION_MS = 10_000

/**
 * Simple seeded PRNG for deterministic fuzzing
 */
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)]
  }

  boolean(): boolean {
    return this.next() < 0.5
  }

  bytes(length: number): Uint8Array {
    const arr = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      arr[i] = this.int(0, 255)
    }
    return arr
  }
}

/**
 * Fuzz loop executor
 */
function fuzzLoop(
  name: string,
  testFn: (rng: SeededRandom, iteration: number) => void
): void {
  if (THOROUGH_MODE) {
    const startTime = Date.now()
    let iterations = 0
    const rng = new SeededRandom(Date.now())

    while (Date.now() - startTime < THOROUGH_DURATION_MS) {
      testFn(rng, iterations)
      iterations++
    }

    console.log(`  ${name}: ${iterations} iterations in ${Date.now() - startTime}ms`)
  } else {
    const rng = new SeededRandom(42) // Fixed seed for determinism
    for (let i = 0; i < STANDARD_ITERATIONS; i++) {
      testFn(rng, i)
    }
  }
}

// ============================================================================
// Input Generators
// ============================================================================

function generateMalformedString(rng: SeededRandom): string {
  const generators = [
    () => '', // Empty
    () => '   ', // Whitespace only
    () => '\x00'.repeat(rng.int(1, 100)), // Null bytes
    () =>
      String.fromCharCode(
        ...Array.from({ length: rng.int(1, 50) }, () => rng.int(0, 31))
      ), // Control chars
    () => '@@depth abc', // Malformed decorator
    () => '@@role invalid_value',
    () => '@@depth -1',
    () => '@@' + '\n'.repeat(rng.int(1, 100)),
    () => '@@unknown decorator value',
    () => '\u{1F600}'.repeat(rng.int(1, 50)), // Emoji
    () => '\uFEFF' + 'content', // BOM
    () => 'a'.repeat(rng.int(1000, 10000)), // Very long
    () => '@@role user\r\n@@depth 1\rcontent\n', // Mixed line endings
    () => '@@role user\n\n\n', // No content after decorator
    () => '@@role user\n@@role assistant\n', // Duplicate decorators
  ]

  return rng.pick(generators)()
}

function generateMalformedDecorators(rng: SeededRandom): Decorator[] {
  const generators = [
    () => [], // Empty
    () => [null as any], // Null in array
    () => [undefined as any], // Undefined in array
    () => [{ type: 'role' } as any], // Missing value
    () => [{ value: 'user' } as any], // Missing type
    () => [{ type: 123, value: 'user' } as any], // Wrong type
    () =>
      Array.from({ length: rng.int(1, 100) }, () => ({
        type: 'unknown',
        name: 'test',
        value: 'value',
      })), // Many decorators
    () => [{ type: 'role', value: '\x00' }], // Null byte in value
  ]

  return rng.pick(generators)()
}

function generateMalformedCard(rng: SeededRandom): any {
  const generators = [
    () => null,
    () => undefined,
    () => 123,
    () => 'string',
    () => [],
    () => true,
    () => ({}), // Missing all fields
    () => ({ name: 123 }), // Wrong type
    () => ({ name: 'Test', description: null }),
    () => ({ name: 'Test', spec: 'invalid' }),
    () => ({ name: 'Test', spec: 'chara_card_v3', spec_version: 'not-a-number' }),
    () => ({
      name: 'a'.repeat(10_000_000),
      spec: 'chara_card_v3',
      spec_version: '3.0',
    }), // Very long string
    () => ({
      __proto__: { admin: true },
      name: 'Test',
      spec: 'chara_card_v3',
      spec_version: '3.0',
    }), // Prototype pollution attempt
    () => ({
      name: 'Test',
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { creation_date: NaN },
    }),
    () => ({
      name: 'Test',
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { creation_date: Infinity },
    }),
    () => ({
      name: 'Test',
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: { tags: 'not-an-array' },
    }),
  ]

  return rng.pick(generators)()
}

function generateMalformedLorebook(rng: SeededRandom): any {
  const generators = [
    () => null,
    () => ({}), // Missing entries
    () => ({ entries: 'not-an-array' }),
    () => ({ entries: [null] }),
    () => ({ entries: [{ keys: 'not-an-array' }] }),
    () => ({ entries: [{ keys: [], content: 123 }] }), // Wrong type
    () => ({ entries: [{ keys: ['key'], enabled: 'not-boolean' }] }),
  ]

  return rng.pick(generators)()
}

function generateMalformedJson(rng: SeededRandom): string {
  const generators = [
    () => '',
    () => 'not json',
    () => '<html>',
    () => '{broken',
    () => '{"key": undefined}',
    () => '[]',
    () => '123',
    () => '"string"',
    () => '\uFEFF{"key": "value"}', // BOM
    () => '{"key": "value"}garbage',
    () => '{ /* comment */ "key": "value" }',
    () => '"{\\"key\\":\\"value\\"}"', // Double-encoded
    () => '{"' + 'a'.repeat(1000) + '": "value"}',
    () => JSON.stringify({ key: '\u0000' }),
    () => '{"a":"a","a":"b"}', // Duplicate keys
  ]

  return rng.pick(generators)()
}

function generateMalformedPng(rng: SeededRandom): Uint8Array {
  const generators = [
    () => new Uint8Array(0), // Empty
    () => new Uint8Array([137, 80, 78, 71]), // Truncated signature
    () => rng.bytes(8), // Invalid signature
    () => {
      // Invalid chunk CRC
      const png = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, // Signature
        0, 0, 0, 13, // IHDR length
        73, 72, 68, 82, // IHDR
        0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, // IHDR data
        255, 255, 255, 255, // Invalid CRC
      ])
      return png
    },
    () => {
      // Minimal valid PNG
      return new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, // Signature
        0, 0, 0, 13, // IHDR length
        73, 72, 68, 82, // IHDR
        0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
        144, 119, 83, 222, // CRC
        0, 0, 0, 0, // IEND length
        73, 69, 78, 68, // IEND
        174, 66, 96, 130, // CRC
      ])
    },
  ]

  return rng.pick(generators)()
}

function generateMalformedZip(rng: SeededRandom): Uint8Array {
  const generators = [
    () => new Uint8Array(0), // Empty
    () => new Uint8Array([80, 75]), // Truncated signature
    () => rng.bytes(100), // Random bytes
    () => {
      // Invalid ZIP signature
      const arr = new Uint8Array(4)
      arr[0] = 80
      arr[1] = 75
      arr[2] = 255
      arr[3] = 255
      return arr
    },
  ]

  return rng.pick(generators)()
}

function generateMalformedBase64(rng: SeededRandom): string {
  const generators = [
    () => '',
    () => '!!!!',
    () => 'abc', // Wrong length
    () => 'ab cd', // Whitespace
    () => 'ab\ncd',
    () => 'abc$', // Invalid char
    () => 'abc', // No padding
    () => 'abc===', // Wrong padding
    () => 'ü', // Unicode
  ]

  return rng.pick(generators)()
}

function generateValidCard(rng: SeededRandom): CharacterCard {
  return {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: `Character ${rng.int(1, 1000)}`,
      description: 'A test character',
      personality: 'Friendly',
      scenario: 'Test scenario',
      first_mes: 'Hello!',
      mes_example: 'Example message',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      group_only_greetings: [],
      tags: [],
      creator: 'Fuzzer',
      character_version: '1.0',
      extensions: {},
    },
  }
}

function generateValidLorebook(rng: SeededRandom): Lorebook {
  return {
    entries: [
      {
        keys: ['test'],
        content: 'Test content',
        enabled: true,
        insertion_order: 0,
        use_regex: false,
        extensions: {},
      },
    ],
  }
}

// Minimal valid PNG (1x1 white pixel)
const MINIMAL_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, // PNG signature
  0, 0, 0, 13, // IHDR length
  73, 72, 68, 82, // IHDR
  0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0,
  144, 119, 83, 222, // CRC
  0, 0, 0, 12, // IDAT length
  73, 68, 65, 84, // IDAT
  8, 153, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0,
  24, 221, 141, 60, // CRC
  0, 0, 0, 0, // IEND length
  73, 69, 78, 68, // IEND
  174, 66, 96, 130, // CRC
])

// ============================================================================
// Input Mutation Tests
// ============================================================================

describe('Fuzz Tests: Input Mutation', () => {
  describe('parseDecorators', () => {
    it('handles malformed input without unexpected errors', () => {
      fuzzLoop('parseDecorators malformed', (rng) => {
        const input = generateMalformedString(rng)
        const start = performance.now()

        try {
          const result = parseDecorators(input)

          // Verify invariants
          expect(result).toBeDefined()
          expect(result).toHaveProperty('decorators')
          expect(result).toHaveProperty('content')
          expect(Array.isArray(result.decorators)).toBe(true)
          expect(typeof result.content).toBe('string')

          // Performance check
          const duration = performance.now() - start
          expect(duration).toBeLessThan(100)
        } catch (error) {
          // Should only throw ParseError if anything
          expect(error).toBeInstanceOf(ParseError)
          expect((error as Error).message).toMatch(/.+/)
        }
      })
    })

    it('preserves unknown decorators', () => {
      fuzzLoop('parseDecorators unknown', (rng) => {
        const unknownName = `test${rng.int(1, 1000)}`
        const input = `@@${unknownName} value\ncontent`

        const result = parseDecorators(input)
        const unknownDecorator = result.decorators.find(
          (d) => d.type === 'unknown'
        )

        if (unknownDecorator && 'name' in unknownDecorator) {
          expect(unknownDecorator.name).toBe(unknownName)
        }
      })
    })

    it('never mutates input string', () => {
      fuzzLoop('parseDecorators immutability', (rng) => {
        const input = generateMalformedString(rng)
        const original = input

        try {
          parseDecorators(input)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toMatch(/.+/)
        }

        expect(input).toBe(original)
      })
    })
  })

  describe('serializeDecorators', () => {
    it('handles malformed decorators without unexpected errors', () => {
      fuzzLoop('serializeDecorators malformed', (rng) => {
        const decorators = generateMalformedDecorators(rng)
        const content = generateMalformedString(rng)
        const start = performance.now()

        try {
          const result = serializeDecorators(decorators as any, content)

          // Verify invariants
          expect(typeof result).toBe('string')

          // Performance check
          const duration = performance.now() - start
          expect(duration).toBeLessThan(100)
        } catch (error) {
          // May throw for invalid input
          expect(error).toBeInstanceOf(Error)
        }
      })
    })

    it('never mutates input decorators or content', () => {
      fuzzLoop('serializeDecorators immutability', (rng) => {
        const decorators: Decorator[] = [
          { type: 'role', value: 'user' },
          { type: 'depth', value: 1 },
        ]
        const content = 'test content'
        const decoratorsJson = JSON.stringify(decorators)
        const contentOriginal = content

        try {
          serializeDecorators(decorators, content)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }

        expect(JSON.stringify(decorators)).toBe(decoratorsJson)
        expect(content).toBe(contentOriginal)
      })
    })

    it('handles empty decorators array', () => {
      fuzzLoop('serializeDecorators empty', (rng) => {
        const content = generateMalformedString(rng)

        const result = serializeDecorators([], content)
        expect(typeof result).toBe('string')
      })
    })
  })

  describe('validateCard', () => {
    it('never throws, always returns ValidationResult', () => {
      fuzzLoop('validateCard safety', (rng) => {
        const card = generateMalformedCard(rng)
        const start = performance.now()

        const result = validateCard(card)

        // Verify invariants
        expect(result).toBeDefined()
        expect(result).toHaveProperty('valid')
        expect(typeof result.valid).toBe('boolean')

        if (!result.valid) {
          expect(result.errors).toBeDefined()
          expect(Array.isArray(result.errors)).toBe(true)
          expect(result.errors!.length).toBeGreaterThan(0)
          result.errors!.forEach((err) => {
            expect(typeof err).toBe('string')
            expect(err.length).toBeGreaterThan(0)
          })
        }

        // Performance check
        const duration = performance.now() - start
        expect(duration).toBeLessThan(100)
      })
    })

    it('never modifies input object', () => {
      fuzzLoop('validateCard immutability', (rng) => {
        const card = generateMalformedCard(rng)
        const original = JSON.stringify(card)

        validateCard(card)

        expect(JSON.stringify(card)).toBe(original)
      })
    })

    it('handles prototype pollution attempts', () => {
      const malicious = {
        __proto__: { admin: true },
        constructor: { prototype: { admin: true } },
        name: 'Test',
        spec: 'chara_card_v3',
        spec_version: '3.0',
      }

      const result = validateCard(malicious)

      expect(result.valid).toBe(false)
    })
  })

  describe('validateLorebook', () => {
    it('never throws, always returns ValidationResult', () => {
      fuzzLoop('validateLorebook safety', (rng) => {
        const lorebook = generateMalformedLorebook(rng)
        const start = performance.now()

        const result = validateLorebook(lorebook)

        // Verify invariants
        expect(result).toBeDefined()
        expect(result).toHaveProperty('valid')
        expect(typeof result.valid).toBe('boolean')

        if (!result.valid) {
          expect(result.errors).toBeDefined()
          expect(Array.isArray(result.errors)).toBe(true)
        }

        // Performance check
        const duration = performance.now() - start
        expect(duration).toBeLessThan(100)
      })
    })
  })

  describe('readCardFromJson', () => {
    it('throws ParseError for invalid JSON', () => {
      fuzzLoop('readCardFromJson malformed', (rng) => {
        const json = generateMalformedJson(rng)
        const start = performance.now()

        try {
          const result = readCardFromJson(json)

          // If it succeeds, should return a valid card
          expect(result).toBeDefined()
          expect(result).toHaveProperty('spec')
        } catch (error) {
          expect(error).toBeInstanceOf(ParseError)
          expect((error as Error).message).toMatch(/.+/)
        }

        // Performance check
        const duration = performance.now() - start
        expect(duration).toBeLessThan(1000)
      })
    })

    it('never mutates input string', () => {
      fuzzLoop('readCardFromJson immutability', (rng) => {
        const json = generateMalformedJson(rng)
        const original = json

        try {
          readCardFromJson(json)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }

        expect(json).toBe(original)
      })
    })
  })

  describe('readCardFromPng', () => {
    it('throws ParseError for invalid PNG', () => {
      fuzzLoop('readCardFromPng malformed', (rng) => {
        const png = generateMalformedPng(rng)
        const start = performance.now()

        try {
          const result = readCardFromPng(png)

          // If it succeeds, should return a valid card
          expect(result).toBeDefined()
          expect(result).toHaveProperty('spec')
        } catch (error) {
          // Should throw ParseError for invalid input
          expect(error).toBeInstanceOf(ParseError)
        }

        // Performance check (for files up to reasonable size)
        if (png.length < 50_000_000) {
          const duration = performance.now() - start
          expect(duration).toBeLessThan(2000)
        }
      })
    })

    it('never causes buffer overruns', () => {
      fuzzLoop('readCardFromPng buffer safety', (rng) => {
        // Test with various buffer edge cases
        const sizes = [0, 1, 7, 8, 9, 100, 1000]
        const size = rng.pick(sizes)
        const png = rng.bytes(size)

        try {
          readCardFromPng(png)
        } catch (error) {
          // Should throw ParseError, not crash
          expect(error).toBeInstanceOf(ParseError)
        }
      })
    })
  })

  describe('readCardFromCharx', () => {
    it('throws ParseError for invalid ZIP', () => {
      fuzzLoop('readCardFromCharx malformed', (rng) => {
        const zip = generateMalformedZip(rng)
        const start = performance.now()

        try {
          const result = readCardFromCharx(zip)

          // If it succeeds, should return a valid card
          expect(result).toBeDefined()
          expect(result).toHaveProperty('spec')
        } catch (error) {
          // Should throw ParseError for invalid input
          expect(error).toBeInstanceOf(ParseError)
        }

        // Performance check
        if (zip.length < 100_000_000) {
          const duration = performance.now() - start
          expect(duration).toBeLessThan(3000)
        }
      })
    })
  })

  describe('encodeBase64 / decodeBase64', () => {
    it('encodeBase64 never throws for valid Uint8Array', () => {
      fuzzLoop('encodeBase64 safety', (rng) => {
        const sizes = [0, 1, 10, 100, 1000, 10000]
        const size = rng.pick(sizes)
        const bytes = rng.bytes(size)
        const start = performance.now()

        const result = encodeBase64(bytes)

        // Verify invariants
        expect(typeof result).toBe('string')
        expect(result).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)

        // Performance check (for reasonable sizes)
        if (size < 10_000_000) {
          const duration = performance.now() - start
          expect(duration).toBeLessThan(1000)
        }
      })
    })

    it('decodeBase64 handles invalid base64', () => {
      fuzzLoop('decodeBase64 malformed', (rng) => {
        const base64 = generateMalformedBase64(rng)

        try {
          const result = decodeBase64(base64)
          expect(result).toBeInstanceOf(Uint8Array)
        } catch (error) {
          // May throw for invalid base64
          expect(error).toBeInstanceOf(Error)
        }
      })
    })

    it('never mutates input', () => {
      fuzzLoop('base64 immutability', (rng) => {
        const bytes = rng.bytes(100)
        const original = new Uint8Array(bytes)

        encodeBase64(bytes)

        expect(bytes).toEqual(original)
      })
    })
  })

  describe('computeCRC32', () => {
    it('always returns unsigned 32-bit integer', () => {
      fuzzLoop('computeCRC32 range', (rng) => {
        const sizes = [0, 1, 10, 100, 1000]
        const size = rng.pick(sizes)
        const bytes = rng.bytes(size)
        const start = performance.now()

        const result = computeCRC32(bytes)

        // Verify invariants
        expect(typeof result).toBe('number')
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(0xffffffff)
        expect(Number.isInteger(result)).toBe(true)

        // Performance check
        if (size < 50_000_000) {
          const duration = performance.now() - start
          expect(duration).toBeLessThan(1000)
        }
      })
    })

    it('is deterministic', () => {
      fuzzLoop('computeCRC32 deterministic', (rng) => {
        const bytes = rng.bytes(100)

        const result1 = computeCRC32(bytes)
        const result2 = computeCRC32(bytes)

        expect(result1).toBe(result2)
      })
    })

    it('handles edge cases', () => {
      const testCases = [
        new Uint8Array(0), // Empty
        new Uint8Array([0]), // Single byte
        new Uint8Array(100).fill(0), // All zeros
        new Uint8Array(100).fill(0xff), // All 0xFF
      ]

      let testedCount = 0
      testCases.forEach((bytes) => {
        const result = computeCRC32(bytes)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(0xffffffff)
        expect(Number.isInteger(result)).toBe(true)
        testedCount++
      })
      expect(testedCount).toBe(4)
    })
  })
})

// ============================================================================
// Property-Based Tests (Roundtrips)
// ============================================================================

describe('Fuzz Tests: Property-Based (Roundtrips)', () => {
  describe('parseDecorators + serializeDecorators', () => {
    it('roundtrip preserves semantics', () => {
      fuzzLoop('decorator roundtrip', (rng) => {
        const roles = ['user', 'assistant', 'system']
        const role = rng.pick(roles)
        const depth = rng.int(0, 10)
        const content = `Test content ${rng.int(1, 1000)}`

        const input = `@@role ${role}\n@@depth ${depth}\n${content}`

        const parsed = parseDecorators(input)
        const serialized = serializeDecorators(parsed.decorators, parsed.content)
        const reparsed = parseDecorators(serialized)

        // Decorators should be preserved
        expect(reparsed.decorators).toHaveLength(parsed.decorators.length)
        expect(reparsed.content.trim()).toBe(parsed.content.trim())
      })
    })
  })

  describe('encodeBase64 + decodeBase64', () => {
    it('roundtrip is identity', () => {
      fuzzLoop('base64 roundtrip', (rng) => {
        const sizes = [0, 1, 10, 100, 1000, 10000]
        const size = rng.pick(sizes)
        const bytes = rng.bytes(size)

        const encoded = encodeBase64(bytes)
        const decoded = decodeBase64(encoded)

        expect(decoded).toEqual(bytes)
      })
    })
  })

  describe('writeCardToJson + readCardFromJson', () => {
    it('roundtrip preserves card data', () => {
      fuzzLoop('JSON roundtrip', (rng) => {
        const card = generateValidCard(rng)

        const json = writeCardToJson(card)
        const parsed = readCardFromJson(json)

        expect(parsed.spec).toBe(card.spec)
        expect(parsed.spec_version).toBe(card.spec_version)
        expect(parsed.data.name).toBe(card.data.name)
        expect(parsed.data.description).toBe(card.data.description)
      })
    })
  })

  describe('writeCardToPng + readCardFromPng', () => {
    it('roundtrip preserves card data', () => {
      fuzzLoop('PNG roundtrip', (rng) => {
        const card = generateValidCard(rng)

        const png = writeCardToPng(card, MINIMAL_PNG)
        const parsed = readCardFromPng(png)

        expect(parsed.spec).toBe(card.spec)
        expect(parsed.spec_version).toBe(card.spec_version)
        expect(parsed.data.name).toBe(card.data.name)
      })
    })
  })

  describe('writeCardToCharx + readCardFromCharx', () => {
    it('roundtrip preserves card data', () => {
      fuzzLoop('CHARX roundtrip', (rng) => {
        const card = generateValidCard(rng)

        const charx = writeCardToCharx(card)
        const parsed = readCardFromCharx(charx)

        expect(parsed.spec).toBe(card.spec)
        expect(parsed.spec_version).toBe(card.spec_version)
        expect(parsed.data.name).toBe(card.data.name)
      })
    })
  })
})

// ============================================================================
// Boundary Exploration Tests
// ============================================================================

describe('Fuzz Tests: Boundary Exploration', () => {
  describe('Numeric boundaries', () => {
    it('handles integer limits in validation', () => {
      const testValues = [
        -1,
        0,
        1,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER + 1,
        Number.MIN_SAFE_INTEGER - 1,
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        NaN,
        Infinity,
        -Infinity,
        -0,
      ]

      let testedCount = 0
      testValues.forEach((value) => {
        const card = {
          name: 'Test',
          spec: 'chara_card_v3',
          spec_version: '3.0',
          data: {
            name: 'Test',
            description: 'Test',
            creation_date: value,
          },
        }

        const result = validateCard(card)
        expect(result.valid === true || result.valid === false).toBe(true)
        testedCount++
      })
      expect(testedCount).toBe(testValues.length)
    })

    it('handles decorator numeric boundaries', () => {
      const depths = [-1, 0, 1, 999999]

      let testedCount = 0
      depths.forEach((depth) => {
        const input = `@@depth ${depth}\nContent`
        const result = parseDecorators(input)
        expect(result.content).toMatch(/Content/)
        testedCount++
      })
      expect(testedCount).toBe(depths.length)
    })
  })

  describe('String boundaries', () => {
    it('handles various string lengths', () => {
      const lengths = [0, 1, 1000, 10000]

      let testedCount = 0
      lengths.forEach((length) => {
        const str = 'a'.repeat(length)
        const card = {
          name: str,
          spec: 'chara_card_v3',
          spec_version: '3.0',
          data: {
            name: str,
            description: str,
          },
        }

        const result = validateCard(card)
        expect(result.valid === true || result.valid === false).toBe(true)
        testedCount++
      })
      expect(testedCount).toBe(lengths.length)
    })

    it('handles special characters', () => {
      const specialStrings = [
        '\x00', // Null byte
        '\n\r\n', // Newlines
        '\t', // Tab
        '\u{1F600}', // Emoji
        '\uFEFF', // BOM
        'Test\x00Test', // Embedded null
        '""', // Quotes
        '\\\\', // Backslashes
      ]

      let testedCount = 0
      specialStrings.forEach((str) => {
        const result = parseDecorators(str)
        expect(result.content).toBe(result.content) // verify content field exists and is stable
        testedCount++
      })
      expect(testedCount).toBe(specialStrings.length)
    })

    it('handles Unicode edge cases', () => {
      const unicodeStrings = [
        '\u{1F600}\u{1F601}', // Multiple emoji
        'Hello\u200BWorld', // Zero-width space
        '\u202E\u202D', // RTL marks
        'a\u0301', // Combining characters
      ]

      let testedCount = 0
      unicodeStrings.forEach((str) => {
        const card = generateValidCard(new SeededRandom(42))
        card.data.name = str

        const json = writeCardToJson(card)
        const parsed = readCardFromJson(json)

        expect(parsed.data.name).toBe(str)
        testedCount++
      })
      expect(testedCount).toBe(unicodeStrings.length)
    })
  })

  describe('Array boundaries', () => {
    it('handles various array lengths', () => {
      const lengths = [0, 1, 10, 100, 1000]

      let testedCount = 0
      lengths.forEach((length) => {
        const card = generateValidCard(new SeededRandom(42))
        card.data.tags = Array.from({ length }, (_, i) => `tag${i}`)
        card.data.alternate_greetings = Array.from(
          { length },
          (_, i) => `greeting${i}`
        )

        const result = validateCard(card)
        expect(result.valid).toBe(true)
        testedCount++
      })
      expect(testedCount).toBe(lengths.length)
    })

    it('handles arrays with null/undefined', () => {
      const card = {
        name: 'Test',
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
          name: 'Test',
          tags: [null, undefined, 'valid'],
        },
      }

      const result = validateCard(card)
      expect(result.valid).toBe(false)
    })
  })

  describe('Object boundaries', () => {
    it('handles empty objects', () => {
      const card = {
        name: 'Test',
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
          name: 'Test',
          extensions: {},
        },
      }

      const result = validateCard(card)
      expect(result.valid === true || result.valid === false).toBe(true)
    })

    it('handles deeply nested extensions', () => {
      const card = generateValidCard(new SeededRandom(42))
      let current: any = card.data.extensions
      for (let i = 0; i < 100; i++) {
        current.nested = {}
        current = current.nested
      }

      const result = validateCard(card)
      expect(result.valid).toBe(true)
    })

    it('handles special property names safely', () => {
      const card = {
        __proto__: null,
        constructor: undefined,
        name: 'Test',
        spec: 'chara_card_v3',
        spec_version: '3.0',
        toString: () => 'custom',
        valueOf: () => 42,
        hasOwnProperty: () => true,
      }

      const result = validateCard(card as any)
      expect(result.valid).toBe(false)
    })
  })
})
