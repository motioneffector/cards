import { describe, it, expect } from 'vitest'
import { readChunks, writeChunks, createTextChunk, computeCRC32 } from './chunks'
import { PNG_SIGNATURE } from '../constants'

// Helper to create minimal PNG with specific chunks
function createPngWithChunks(chunks: { type: string; data: Uint8Array }[]): Uint8Array {
  const fullChunks = chunks.map(c => ({
    length: c.data.length,
    type: c.type,
    data: c.data,
    crc: computeCRC32(
      new Uint8Array([...c.type].map(ch => ch.charCodeAt(0))),
      c.data
    ),
  }))
  return writeChunks(fullChunks)
}

describe('PNG Chunk Handling', () => {
  describe('Low-Level Reading', () => {
    it('reads PNG signature', () => {
      const png = createPngWithChunks([
        { type: 'IHDR', data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) },
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      // First 8 bytes should be PNG signature
      expect(png[0]).toBe(0x89)
      expect(png[1]).toBe(0x50)
      expect(png[2]).toBe(0x4e)
      expect(png[3]).toBe(0x47)
      expect(png[4]).toBe(0x0d)
      expect(png[5]).toBe(0x0a)
      expect(png[6]).toBe(0x1a)
      expect(png[7]).toBe(0x0a)
      // Should be readable
      const chunks = readChunks(png)
      expect(chunks[0]?.type).toBe('IHDR')
    })

    it('reads chunk length', () => {
      const ihdrData = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
      const png = createPngWithChunks([
        { type: 'IHDR', data: ihdrData },
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      const chunks = readChunks(png)
      expect(chunks[0].length).toBe(ihdrData.length)
    })

    it('reads chunk type', () => {
      const png = createPngWithChunks([
        { type: 'IHDR', data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) },
        { type: 'tEXt', data: new Uint8Array([116, 101, 115, 116, 0, 100, 97, 116, 97]) }, // "test\0data"
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      const chunks = readChunks(png)
      expect(chunks[0].type).toBe('IHDR')
      expect(chunks[1].type).toBe('tEXt')
      expect(chunks[2].type).toBe('IEND')
    })

    it('reads chunk data', () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5])
      const png = createPngWithChunks([
        { type: 'IHDR', data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) },
        { type: 'tEXt', data: testData },
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      const chunks = readChunks(png)
      const textChunk = chunks.find(c => c.type === 'tEXt')
      expect(textChunk?.data).toEqual(testData)
    })

    it('reads chunk CRC', () => {
      const png = createPngWithChunks([
        { type: 'IHDR', data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) },
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      const chunks = readChunks(png)
      expect(chunks[0].crc).not.toBe(0)
      expect(Number.isInteger(chunks[0].crc)).toBe(true)
    })

    it('iterates all chunks', () => {
      const png = createPngWithChunks([
        { type: 'IHDR', data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]) },
        { type: 'tEXt', data: new Uint8Array([116, 0, 118]) },
        { type: 'tEXt', data: new Uint8Array([107, 0, 119]) },
        { type: 'IEND', data: new Uint8Array(0) },
      ])
      const chunks = readChunks(png)
      expect(chunks.length).toBe(4)
      expect(chunks.map(c => c.type)).toEqual(['IHDR', 'tEXt', 'tEXt', 'IEND'])
    })
  })

  describe('Low-Level Writing', () => {
    it('writes correct chunk length', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const chunk = createTextChunk('test', 'hello')
      expect(chunk.length).toBe(chunk.data.length)
    })

    it('writes chunk type', () => {
      const chunk = createTextChunk('ccv3', 'data')
      expect(chunk.type).toBe('tEXt')
    })

    it('writes chunk data', () => {
      const chunk = createTextChunk('test', 'payload')
      // Data should contain keyword + null + text
      expect(chunk.data.length).toBe('test'.length + 1 + 'payload'.length)
    })

    it('computes and writes CRC', () => {
      const chunk = createTextChunk('test', 'data')
      // Verify CRC is computed correctly
      const typeBytes = new Uint8Array([116, 69, 88, 116]) // "tEXt"
      const expectedCrc = computeCRC32(typeBytes, chunk.data)
      expect(chunk.crc).toBe(expectedCrc)
    })
  })

  describe('CRC-32', () => {
    it('computes CRC for empty data', () => {
      const crc = computeCRC32(new Uint8Array([]))
      // CRC of empty data is well-known
      expect(crc).toBe(0)
    })

    it('computes CRC for chunk type + data', () => {
      const typeBytes = new Uint8Array([116, 69, 88, 116]) // "tEXt"
      const data = new Uint8Array([116, 101, 115, 116, 0, 100, 97, 116, 97])
      const crc = computeCRC32(typeBytes, data)
      expect(crc).toBeGreaterThan(0)
    })

    it('matches known test vectors', () => {
      // Test with "123456789" - well-known CRC-32 test
      const testString = '123456789'
      const data = new Uint8Array([...testString].map(c => c.charCodeAt(0)))
      const crc = computeCRC32(data)
      // CRC-32 of "123456789" is 0xCBF43926
      expect(crc).toBe(0xcbf43926)
    })
  })
})
