/**
 * Card reading functions
 */

import type {
  CharacterCard,
  CharacterCardV2,
  CharacterCardV1,
  ReadOptions,
  Lorebook,
  LorebookEntry,
  StandaloneLorebook,
} from '../types'
import { ParseError } from '../errors'
import { readChunks, computeCRC32 } from '../png/chunks'
import { decodeBase64 } from '../utils/base64'
import { decodeUTF8 } from '../utils/utf8'
import { parseDecorators } from '../lorebook/decorators'
import {
  CHUNK_KEYWORD_CCv3,
  CHUNK_KEYWORD_CHARA,
  CHUNK_KEYWORD_NAIDATA,
  SPEC_V3,
  SPEC_V2,
} from '../constants'
import { extractZip } from '../zip/index'

/**
 * Read a character card from any supported format (auto-detect)
 *
 * @param data - PNG bytes, JSON string, or CHARX bytes
 * @param options - Reading options
 * @returns Parsed character card in V3 format
 */
export function readCard(data: Uint8Array | string, options?: ReadOptions): CharacterCard {
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
export function readCardFromPng(bytes: Uint8Array, options?: ReadOptions): CharacterCard {
  const strict = options?.strict ?? false
  const shouldParseDecorators = options?.parseDecorators ?? true

  // Parse PNG chunks
  let chunks
  try {
    chunks = readChunks(bytes)
  } catch {
    throw new ParseError('Invalid PNG file')
  }

  // Find card data in text chunks
  let ccv3Data: string | null = null
  let charaData: string | null = null
  let ccv3CrcValid = true
  let charaCrcValid = true

  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      const { keyword, text, crcValid } = parseTextChunk(chunk.data, chunk.crc)

      if (keyword === CHUNK_KEYWORD_CCv3) {
        ccv3Data = text
        ccv3CrcValid = crcValid
      } else if (keyword === CHUNK_KEYWORD_CHARA) {
        charaData = text
        charaCrcValid = crcValid
      }
    }
  }

  // Prefer ccv3 over chara
  let cardJson: string | null = null
  let crcValid = true

  if (ccv3Data) {
    cardJson = ccv3Data
    crcValid = ccv3CrcValid
  } else if (charaData) {
    cardJson = charaData
    crcValid = charaCrcValid
  }

  if (!cardJson) {
    throw new ParseError('No character card data found in PNG')
  }

  if (strict && !crcValid) {
    throw new ParseError('CRC mismatch in card chunk')
  }

  // Decode base64 and parse JSON
  let jsonString: string
  try {
    const decoded = decodeBase64(cardJson)
    jsonString = decodeUTF8(decoded)
  } catch {
    throw new ParseError('Failed to decode base64 card data')
  }

  // Parse and normalize
  return readCardFromJson(jsonString, { ...options, parseDecorators: shouldParseDecorators })
}

/**
 * Read character card from JSON string
 */
export function readCardFromJson(json: string, options?: ReadOptions): CharacterCard {
  const strict = options?.strict ?? false
  const shouldParseDecorators = options?.parseDecorators ?? true

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ParseError('Invalid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ParseError('JSON must be an object')
  }

  const obj = parsed as Record<string, unknown>

  // Detect version and normalize
  if (obj.spec === SPEC_V3) {
    // V3 card
    const card = parsed as CharacterCard
    if (shouldParseDecorators && card.data.character_book) {
      card.data.character_book = parseLorebookDecorators(card.data.character_book)
    }
    return card
  } else if (obj.spec === SPEC_V2) {
    // V2 card - normalize to V3
    const v2 = parsed as CharacterCardV2
    return normalizeV2ToV3(v2, shouldParseDecorators)
  } else if ('name' in obj && 'description' in obj) {
    // V1 card (no spec wrapper)
    const v1 = parsed as CharacterCardV1
    return normalizeV1ToV3(v1, shouldParseDecorators)
  }

  if (strict) {
    throw new ParseError('Unrecognized card format')
  }

  throw new ParseError('Unrecognized card format')
}

/**
 * Read character card from CHARX (ZIP) file
 */
export function readCardFromCharx(bytes: Uint8Array, options?: ReadOptions): CharacterCard {
  let files: Map<string, Uint8Array>
  try {
    files = extractZip(bytes)
  } catch {
    throw new ParseError('Invalid CHARX/ZIP file')
  }

  const cardJsonBytes = files.get('card.json')
  if (!cardJsonBytes) {
    throw new ParseError('Missing card.json in CHARX file')
  }

  const jsonString = decodeUTF8(cardJsonBytes)
  const card = readCardFromJson(jsonString, options)

  // Map embedded assets
  if (card.data.assets) {
    for (const asset of card.data.assets) {
      if (asset.uri.startsWith('embeded://')) {
        const path = asset.uri.slice('embeded://'.length)
        const data = files.get(path)
        if (data) {
          // Store asset data in extensions for retrieval
          asset.uri = `data:application/octet-stream;base64,${Buffer.from(data).toString('base64')}`
        }
      }
    }
  }

  return card
}

/**
 * Read standalone lorebook from PNG or JSON
 */
export function readLorebook(data: Uint8Array | string, options?: ReadOptions): Lorebook {
  const shouldParseDecorators = options?.parseDecorators ?? true

  if (typeof data === 'string') {
    return readLorebookFromJson(data, shouldParseDecorators)
  }

  // PNG - look for naidata or chara chunk
  if (!isPNG(data)) {
    throw new ParseError('Lorebook data must be PNG or JSON')
  }

  let chunks
  try {
    chunks = readChunks(data)
  } catch {
    throw new ParseError('Invalid PNG file')
  }

  let naidataText: string | null = null
  let charaText: string | null = null

  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      const { keyword, text } = parseTextChunk(chunk.data, chunk.crc)

      if (keyword === CHUNK_KEYWORD_NAIDATA) {
        naidataText = text
      } else if (keyword === CHUNK_KEYWORD_CHARA) {
        charaText = text
      }
    }
  }

  // Prefer naidata over chara for lorebooks
  const lorebookB64 = naidataText ?? charaText
  if (!lorebookB64) {
    throw new ParseError('No lorebook data found in PNG')
  }

  let jsonString: string
  try {
    const decoded = decodeBase64(lorebookB64)
    jsonString = decodeUTF8(decoded)
  } catch {
    throw new ParseError('Failed to decode base64 lorebook data')
  }

  return readLorebookFromJson(jsonString, shouldParseDecorators)
}

/**
 * Parse lorebook from JSON string
 */
function readLorebookFromJson(json: string, parseDecoratorsSetting: boolean): Lorebook {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ParseError('Invalid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ParseError('JSON must be an object')
  }

  const obj = parsed as Record<string, unknown>

  // Check if wrapped in lorebook_v3 spec
  if (obj.spec === 'lorebook_v3' && obj.data) {
    const standalone = parsed as StandaloneLorebook
    const lorebook = standalone.data
    if (parseDecoratorsSetting) {
      return parseLorebookDecorators(lorebook)
    }
    return lorebook
  }

  // Check if it's an array (just entries)
  if (Array.isArray(parsed)) {
    const lorebook: Lorebook = {
      entries: parsed as LorebookEntry[],
      extensions: {},
    }
    if (parseDecoratorsSetting) {
      return parseLorebookDecorators(lorebook)
    }
    return lorebook
  }

  // Assume it's a direct lorebook object
  const lorebook = parsed as Lorebook
  if (parseDecoratorsSetting) {
    return parseLorebookDecorators(lorebook)
  }
  return lorebook
}

/**
 * Parse text chunk data
 */
function parseTextChunk(
  data: Uint8Array,
  crc: number
): { keyword: string; text: string; crcValid: boolean } {
  // Find null terminator
  let nullIndex = -1
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) {
      nullIndex = i
      break
    }
  }

  if (nullIndex === -1) {
    return { keyword: '', text: '', crcValid: false }
  }

  // Extract keyword
  const keywordBytes = data.slice(0, nullIndex)
  let keyword = ''
  for (let i = 0; i < keywordBytes.length; i++) {
    keyword += String.fromCharCode(keywordBytes[i] ?? 0)
  }

  // Extract text
  const textBytes = data.slice(nullIndex + 1)
  let text = ''
  for (let i = 0; i < textBytes.length; i++) {
    text += String.fromCharCode(textBytes[i] ?? 0)
  }

  // Verify CRC
  const typeBytes = new Uint8Array([116, 69, 88, 116]) // "tEXt"
  const expectedCrc = computeCRC32(typeBytes, data)
  const crcValid = expectedCrc === crc

  return { keyword, text, crcValid }
}

/**
 * Normalize V1 card to V3
 */
function normalizeV1ToV3(v1: CharacterCardV1, _parseDecoratorsSetting: boolean): CharacterCard {
  const card: CharacterCard = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      // V1 fields
      name: v1.name,
      description: v1.description,
      personality: v1.personality,
      scenario: v1.scenario,
      first_mes: v1.first_mes,
      mes_example: v1.mes_example,
      // V2 defaults
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '',
      extensions: {},
      // V3 defaults
      group_only_greetings: [],
    },
  }

  return card
}

/**
 * Normalize V2 card to V3
 */
function normalizeV2ToV3(v2: CharacterCardV2, parseDecoratorsSetting: boolean): CharacterCard {
  const card: CharacterCard = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      // V1/V2 fields
      name: v2.data.name,
      description: v2.data.description,
      personality: v2.data.personality,
      scenario: v2.data.scenario,
      first_mes: v2.data.first_mes,
      mes_example: v2.data.mes_example,
      // V2 fields
      creator_notes: v2.data.creator_notes,
      system_prompt: v2.data.system_prompt,
      post_history_instructions: v2.data.post_history_instructions,
      alternate_greetings: v2.data.alternate_greetings,
      tags: v2.data.tags,
      creator: v2.data.creator,
      character_version: v2.data.character_version,
      extensions: v2.data.extensions,
      // V3 defaults
      group_only_greetings: [],
      ...(v2.data.character_book !== undefined && { character_book: v2.data.character_book }),
    },
  }

  if (parseDecoratorsSetting && card.data.character_book) {
    card.data.character_book = parseLorebookDecorators(card.data.character_book)
  }

  return card
}

/**
 * Parse decorators in all lorebook entries
 */
function parseLorebookDecorators(lorebook: Lorebook): Lorebook {
  return {
    ...lorebook,
    entries: lorebook.entries.map((entry) => {
      const { decorators, content } = parseDecorators(entry.content)
      return {
        ...entry,
        content,
        decorators,
      }
    }),
  }
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
