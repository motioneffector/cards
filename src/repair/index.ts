/**
 * Card repair and recovery functions
 */

import type { CharacterCard, RepairResult, PngChunk } from '../types'
import { readChunks, writeChunks, computeCRC32 } from '../png/chunks'
import { decodeBase64 } from '../utils/base64'
import { decodeUTF8 } from '../utils/utf8'
import { PNG_SIGNATURE } from '../constants'

/**
 * Attempt to repair and recover data from a corrupted character card PNG
 *
 * @param bytes - Possibly corrupted PNG bytes
 * @returns Repair result with recovered card and warnings
 */
export function repairCard(bytes: Uint8Array): RepairResult {
  const warnings: string[] = []
  const recovered: string[] = []
  let cardData: Partial<CharacterCard['data']> = {}

  // Try to parse PNG chunks
  let chunks: PngChunk[] = []
  let cleanImage = bytes

  try {
    chunks = readChunks(bytes)
  } catch {
    warnings.push('Failed to parse PNG structure')
    // Try to find card data directly in bytes
    const extracted = extractCardDataFromBytes(bytes)
    if (extracted.data) {
      cardData = extracted.data
      recovered.push(...extracted.recovered)
      warnings.push(...extracted.warnings)
    }
  }

  // Look for card data in text chunks
  let ccv3Text: string | null = null
  let charaText: string | null = null

  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      const { keyword, text, crcValid } = parseTextChunk(chunk.data, chunk.crc)

      if (!crcValid) {
        warnings.push(`Invalid CRC in ${keyword} chunk`)
      }

      if (keyword === 'ccv3') {
        ccv3Text = text
      } else if (keyword === 'chara') {
        charaText = text
      }
    }
  }

  // Try to decode and parse card data
  const textToParse = ccv3Text ?? charaText
  if (textToParse) {
    const parseResult = tryParseCardText(textToParse)
    if (parseResult.data) {
      cardData = mergeCardData(cardData, parseResult.data)
      recovered.push(...parseResult.recovered)
    }
    warnings.push(...parseResult.warnings)
  }

  // If we have chara data too, try to merge
  if (ccv3Text && charaText) {
    const charaResult = tryParseCardText(charaText)
    if (charaResult.data) {
      cardData = mergeCardData(cardData, charaResult.data)
      if (charaResult.recovered.length > 0) {
        warnings.push('Merged data from multiple chunks')
      }
    }
  }

  // Build the repaired card
  const repairedCard: CharacterCard = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: cardData.name ?? '',
      description: cardData.description ?? '',
      personality: cardData.personality ?? '',
      scenario: cardData.scenario ?? '',
      first_mes: cardData.first_mes ?? '',
      mes_example: cardData.mes_example ?? '',
      creator_notes: cardData.creator_notes ?? '',
      system_prompt: cardData.system_prompt ?? '',
      post_history_instructions: cardData.post_history_instructions ?? '',
      alternate_greetings: cardData.alternate_greetings ?? [],
      tags: cardData.tags ?? [],
      creator: cardData.creator ?? '',
      character_version: cardData.character_version ?? '',
      extensions: cardData.extensions ?? {},
      group_only_greetings: cardData.group_only_greetings ?? [],
      ...(cardData.character_book !== undefined && { character_book: cardData.character_book }),
    },
  }

  // Track which fields were recovered
  if (cardData.name) recovered.push('name')
  if (cardData.description) recovered.push('description')
  if (cardData.personality) recovered.push('personality')
  if (cardData.scenario) recovered.push('scenario')
  if (cardData.first_mes) recovered.push('first_mes')
  if (cardData.character_book) recovered.push('character_book')

  // Create clean image without card metadata
  cleanImage = createCleanImage(chunks)

  return {
    card: repairedCard,
    image: cleanImage,
    warnings: [...new Set(warnings)],
    recovered: [...new Set(recovered)],
  }
}

/**
 * Parse text chunk data
 */
function parseTextChunk(
  data: Uint8Array,
  crc: number
): { keyword: string; text: string; crcValid: boolean } {
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

  const keywordBytes = data.slice(0, nullIndex)
  let keyword = ''
  for (let i = 0; i < keywordBytes.length; i++) {
    keyword += String.fromCharCode(keywordBytes[i] ?? 0)
  }

  const textBytes = data.slice(nullIndex + 1)
  let text = ''
  for (let i = 0; i < textBytes.length; i++) {
    text += String.fromCharCode(textBytes[i] ?? 0)
  }

  const typeBytes = new Uint8Array([116, 69, 88, 116])
  const expectedCrc = computeCRC32(typeBytes, data)
  const crcValid = expectedCrc === crc

  return { keyword, text, crcValid }
}

/**
 * Try to parse card text (base64 -> UTF-8 -> JSON)
 */
function tryParseCardText(text: string): {
  data: Partial<CharacterCard['data']> | null
  warnings: string[]
  recovered: string[]
} {
  const warnings: string[] = []

  // Try to decode base64
  let decoded: Uint8Array
  try {
    decoded = decodeBase64(text)
  } catch {
    // Try truncated base64 recovery
    const trimmed = text.replace(/[^A-Za-z0-9+/=]/g, '')
    const padded = trimmed + '='.repeat((4 - (trimmed.length % 4)) % 4)
    try {
      decoded = decodeBase64(padded)
      warnings.push('Truncated base64 recovered')
    } catch {
      return { data: null, warnings: ['Failed to decode base64'], recovered: [] }
    }
  }

  // Try to decode UTF-8
  let jsonString: string
  try {
    jsonString = decodeUTF8(decoded)
  } catch {
    // Try with replacement characters
    jsonString = ''
    for (let i = 0; i < decoded.length; i++) {
      const byte = decoded[i] ?? 0
      if (byte < 128) {
        jsonString += String.fromCharCode(byte)
      } else {
        jsonString += '?'
      }
    }
    warnings.push('Malformed UTF-8 recovered')
  }

  // Try to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    // Try to extract partial JSON
    const extracted = extractPartialJson(jsonString)
    if (extracted) {
      warnings.push('Partial JSON recovered')
      return { data: extracted, warnings, recovered: Object.keys(extracted) }
    }
    return { data: null, warnings: [...warnings, 'Failed to parse JSON'], recovered: [] }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { data: null, warnings: [...warnings, 'Invalid JSON structure'], recovered: [] }
  }

  const obj = parsed as Record<string, unknown>

  // Extract data based on structure
  if (obj.spec === 'chara_card_v3' && obj.data) {
    return { data: obj.data as Partial<CharacterCard['data']>, warnings, recovered: ['full_card'] }
  } else if (obj.spec === 'chara_card_v2' && obj.data) {
    return { data: obj.data as Partial<CharacterCard['data']>, warnings, recovered: ['full_card'] }
  } else if ('name' in obj) {
    return { data: obj as Partial<CharacterCard['data']>, warnings, recovered: ['v1_card'] }
  }

  return { data: null, warnings: [...warnings, 'Unknown card format'], recovered: [] }
}

/**
 * Extract partial JSON data
 */
function extractPartialJson(jsonString: string): Partial<CharacterCard['data']> | null {
  const data: Partial<CharacterCard['data']> = {}

  // Try to extract name
  const nameMatch = jsonString.match(/"name"\s*:\s*"([^"]*)"/)
  if (nameMatch?.[1]) {
    data.name = nameMatch[1]
  }

  // Try to extract description
  const descMatch = jsonString.match(/"description"\s*:\s*"([^"]*)"/)
  if (descMatch?.[1]) {
    data.description = descMatch[1]
  }

  // Try to extract personality
  const persMatch = jsonString.match(/"personality"\s*:\s*"([^"]*)"/)
  if (persMatch?.[1]) {
    data.personality = persMatch[1]
  }

  // Try to extract first_mes
  const firstMesMatch = jsonString.match(/"first_mes"\s*:\s*"([^"]*)"/)
  if (firstMesMatch?.[1]) {
    data.first_mes = firstMesMatch[1]
  }

  if (Object.keys(data).length > 0) {
    return data
  }

  return null
}

/**
 * Extract card data directly from bytes (when PNG parsing fails)
 */
function extractCardDataFromBytes(bytes: Uint8Array): {
  data: Partial<CharacterCard['data']> | null
  warnings: string[]
  recovered: string[]
} {
  // Look for base64 encoded JSON
  const str = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('')

  // Look for base64 patterns
  const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g
  const matches = str.match(base64Pattern)

  if (matches) {
    for (const match of matches) {
      const result = tryParseCardText(match)
      if (result.data) {
        return {
          data: result.data,
          warnings: ['Extracted card data from raw bytes', ...result.warnings],
          recovered: result.recovered,
        }
      }
    }
  }

  return { data: null, warnings: ['Could not extract card data'], recovered: [] }
}

/**
 * Forbidden keys for prototype pollution prevention
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Merge card data from multiple sources (safe from prototype pollution)
 */
function mergeCardData(
  existing: Partial<CharacterCard['data']>,
  incoming: Partial<CharacterCard['data']>
): Partial<CharacterCard['data']> {
  // Create result without spread to avoid prototype pollution
  const result: Partial<CharacterCard['data']> = {}

  // Safely copy existing properties
  for (const key of Object.keys(existing)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    if (!Object.hasOwn(existing, key)) continue
    result[key as keyof CharacterCard['data']] = existing[key as keyof CharacterCard['data']]
  }

  // Safely copy incoming properties
  for (const key of Object.keys(incoming)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    if (!Object.hasOwn(incoming, key)) continue
    result[key as keyof CharacterCard['data']] = incoming[key as keyof CharacterCard['data']]
  }

  // Prefer non-empty values - only set if defined
  if (incoming.name !== undefined) result.name = incoming.name
  else if (existing.name !== undefined) result.name = existing.name

  if (incoming.description !== undefined) result.description = incoming.description
  else if (existing.description !== undefined) result.description = existing.description

  if (incoming.personality !== undefined) result.personality = incoming.personality
  else if (existing.personality !== undefined) result.personality = existing.personality

  if (incoming.scenario !== undefined) result.scenario = incoming.scenario
  else if (existing.scenario !== undefined) result.scenario = existing.scenario

  if (incoming.first_mes !== undefined) result.first_mes = incoming.first_mes
  else if (existing.first_mes !== undefined) result.first_mes = existing.first_mes

  if (incoming.mes_example !== undefined) result.mes_example = incoming.mes_example
  else if (existing.mes_example !== undefined) result.mes_example = existing.mes_example

  return result
}

/**
 * Create clean PNG without card metadata chunks
 */
function createCleanImage(chunks: PngChunk[]): Uint8Array {
  const cleanChunks = chunks.filter((chunk) => {
    if (chunk.type !== 'tEXt') return true

    const { keyword } = parseTextChunk(chunk.data, chunk.crc)
    return keyword !== 'ccv3' && keyword !== 'chara' && keyword !== 'naidata'
  })

  if (cleanChunks.length === 0) {
    // Return minimal PNG
    return new Uint8Array([...PNG_SIGNATURE])
  }

  return writeChunks(cleanChunks)
}
