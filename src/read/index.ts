/**
 * Card reading functions
 */

import type { CharacterCard, ReadOptions } from '../types'
import type { Lorebook } from '../types'
import { ParseError } from '../errors'

/**
 * Read a character card from any supported format (auto-detect)
 *
 * @param data - PNG bytes, JSON string, or CHARX bytes
 * @param options - Reading options
 * @returns Parsed character card in V3 format
 */
export function readCard(
  data: Uint8Array | string,
  options?: ReadOptions
): CharacterCard {
  // Auto-detect format and delegate
  if (typeof data === 'string') {
    return readCardFromJson(data, options)
  }

  // Check PNG signature
  if (isPNG(data)) {
    return readCardFromPng(data, options)
  }

  // Check ZIP signature
  if (isZIP(data)) {
    return readCardFromCharx(data, options)
  }

  throw new ParseError('Unrecognized format: not PNG, JSON, or CHARX')
}

/**
 * Read character card from PNG file
 */
export function readCardFromPng(
  bytes: Uint8Array,
  options?: ReadOptions
): CharacterCard {
  throw new Error('Not implemented')
}

/**
 * Read character card from JSON string
 */
export function readCardFromJson(
  json: string,
  options?: ReadOptions
): CharacterCard {
  throw new Error('Not implemented')
}

/**
 * Read character card from CHARX (ZIP) file
 */
export function readCardFromCharx(
  bytes: Uint8Array,
  options?: ReadOptions
): CharacterCard {
  throw new Error('Not implemented')
}

/**
 * Read standalone lorebook from PNG or JSON
 */
export function readLorebook(
  data: Uint8Array | string,
  options?: ReadOptions
): Lorebook {
  throw new Error('Not implemented')
}

/**
 * Check if bytes start with PNG signature
 */
function isPNG(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
}

/**
 * Check if bytes start with ZIP signature
 */
function isZIP(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  return (
    (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x05 && bytes[3] === 0x06)
  )
}
