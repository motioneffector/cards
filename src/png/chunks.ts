/**
 * Low-level PNG chunk reading and writing
 */

import type { PngChunk } from '../types'
import { PNG_SIGNATURE } from '../constants'
import { computeCRC32 } from './crc'

/**
 * Maximum allowed PNG chunk size (100MB)
 */
const MAX_CHUNK_SIZE = 100 * 1024 * 1024

/**
 * Read all chunks from PNG bytes
 *
 * @param bytes - PNG file bytes
 * @returns Array of chunks
 */
export function readChunks(bytes: Uint8Array): PngChunk[] {
  // Verify PNG signature
  if (!verifySignature(bytes)) {
    throw new Error('Invalid PNG signature')
  }

  const chunks: PngChunk[] = []
  let offset = 8 // Skip signature

  while (offset < bytes.length) {
    // Ensure we have enough bytes for chunk header
    if (offset + 8 > bytes.length) {
      throw new Error('Invalid PNG: truncated chunk header')
    }

    // Read chunk length (4 bytes, big-endian)
    const length =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)

    // Validate chunk length
    if (length < 0 || length > MAX_CHUNK_SIZE) {
      throw new Error(`Invalid PNG: chunk length ${length} exceeds maximum allowed size`)
    }

    offset += 4

    // Read chunk type (4 bytes ASCII)
    const typeBytes = bytes.slice(offset, offset + 4)
    const type = String.fromCharCode(...typeBytes)
    offset += 4

    // Ensure we have enough bytes for chunk data and CRC
    if (offset + length + 4 > bytes.length) {
      throw new Error(`Invalid PNG: chunk data extends beyond file bounds`)
    }

    // Read chunk data
    const data = bytes.slice(offset, offset + length)
    offset += length

    // Read CRC (4 bytes, big-endian)
    const crc =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)

    offset += 4

    chunks.push({ length, type, data, crc })

    // Stop at IEND
    if (type === 'IEND') break
  }

  return chunks
}

/**
 * Write chunks to PNG bytes
 *
 * @param chunks - Chunks to write
 * @returns PNG file bytes
 */
export function writeChunks(chunks: PngChunk[]): Uint8Array {
  // Calculate total size
  let totalSize = 8 // PNG signature
  for (const chunk of chunks) {
    totalSize += 12 + chunk.length // length + type + data + crc
  }

  const bytes = new Uint8Array(totalSize)
  let offset = 0

  // Write signature
  bytes.set(PNG_SIGNATURE, offset)
  offset += 8

  // Write chunks
  for (const chunk of chunks) {
    // Write length
    bytes[offset++] = (chunk.length >> 24) & 0xff
    bytes[offset++] = (chunk.length >> 16) & 0xff
    bytes[offset++] = (chunk.length >> 8) & 0xff
    bytes[offset++] = chunk.length & 0xff

    // Write type
    const typeBytes = new Uint8Array(4)
    for (let i = 0; i < 4; i++) {
      typeBytes[i] = chunk.type.charCodeAt(i)
    }
    bytes.set(typeBytes, offset)
    offset += 4

    // Write data
    bytes.set(chunk.data, offset)
    offset += chunk.length

    // Write CRC
    bytes[offset++] = (chunk.crc >> 24) & 0xff
    bytes[offset++] = (chunk.crc >> 16) & 0xff
    bytes[offset++] = (chunk.crc >> 8) & 0xff
    bytes[offset++] = chunk.crc & 0xff
  }

  return bytes
}

/**
 * Create a text chunk
 *
 * @param keyword - Chunk keyword
 * @param text - Text payload
 * @returns PNG chunk
 */
export function createTextChunk(keyword: string, text: string): PngChunk {
  // Encode keyword (null-terminated)
  const keywordBytes = new Uint8Array(keyword.length + 1)
  for (let i = 0; i < keyword.length; i++) {
    keywordBytes[i] = keyword.charCodeAt(i)
  }
  keywordBytes[keyword.length] = 0 // null terminator

  // Encode text
  const textBytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    textBytes[i] = text.charCodeAt(i)
  }

  // Combine
  const data = new Uint8Array(keywordBytes.length + textBytes.length)
  data.set(keywordBytes, 0)
  data.set(textBytes, keywordBytes.length)

  // Compute CRC
  const typeBytes = new Uint8Array([116, 69, 88, 116]) // "tEXt"
  const crc = computeCRC32(typeBytes, data)

  return {
    length: data.length,
    type: 'tEXt',
    data,
    crc,
  }
}

/**
 * Verify PNG signature
 */
function verifySignature(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false

  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      return false
    }
  }

  return true
}

// Export CRC function for testing
export { computeCRC32 }
