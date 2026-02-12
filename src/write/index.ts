/**
 * Card writing functions
 */

import type {
  CharacterCard,
  CharacterCardV2,
  CharacterDataV2,
  Lorebook,
  WritePngOptions,
  WriteCharxOptions,
} from '../types'
import { readChunks, writeChunks, createTextChunk } from '../png/chunks'
import { encodeBase64 } from '../utils/base64'
import { encodeUTF8 } from '../utils/utf8'
import { serializeDecorators } from '../lorebook/decorators'
import { CHUNK_KEYWORD_CCv3, CHUNK_KEYWORD_CHARA, CHUNK_KEYWORD_NAIDATA } from '../constants'
import { createZip } from '../zip/index'

/**
 * Write character card to PNG file
 *
 * @param card - Character card to write
 * @param imageBytes - Existing PNG image bytes
 * @param options - Writing options
 * @returns PNG bytes with embedded card data
 */
export function writeCardToPng(
  card: CharacterCard,
  imageBytes: Uint8Array,
  options?: WritePngOptions
): Uint8Array {
  const includeV2Chunk = options?.includeV2Chunk ?? true
  const shouldSerializeDecorators = options?.serializeDecorators ?? true

  // Parse existing PNG chunks
  const chunks = readChunks(imageBytes)

  // Remove existing card chunks
  const filteredChunks = chunks.filter(
    (chunk) =>
      !(
        chunk.type === 'tEXt' &&
        (getTextChunkKeyword(chunk.data) === CHUNK_KEYWORD_CCv3 ||
          getTextChunkKeyword(chunk.data) === CHUNK_KEYWORD_CHARA)
      )
  )

  // Prepare card for serialization
  const cardToSerialize = shouldSerializeDecorators ? serializeCardDecorators(card) : card

  // Serialize V3 card to JSON and base64
  const v3Json = JSON.stringify(cardToSerialize)
  const v3Utf8 = encodeUTF8(v3Json)
  const v3Base64 = encodeBase64(v3Utf8)

  // Create ccv3 chunk
  const ccv3Chunk = createTextChunk(CHUNK_KEYWORD_CCv3, v3Base64)

  // Find IEND chunk index
  const iendIndex = filteredChunks.findIndex((c) => c.type === 'IEND')

  // Insert ccv3 chunk before IEND
  const newChunks = [...filteredChunks]
  if (iendIndex >= 0) {
    newChunks.splice(iendIndex, 0, ccv3Chunk)
  } else {
    newChunks.push(ccv3Chunk)
  }

  // Optionally add V2 compatibility chunk
  if (includeV2Chunk) {
    const v2Card = convertV3ToV2(cardToSerialize)
    const v2Json = JSON.stringify(v2Card)
    const v2Utf8 = encodeUTF8(v2Json)
    const v2Base64 = encodeBase64(v2Utf8)
    const charaChunk = createTextChunk(CHUNK_KEYWORD_CHARA, v2Base64)

    const newIendIndex = newChunks.findIndex((c) => c.type === 'IEND')
    if (newIendIndex >= 0) {
      newChunks.splice(newIendIndex, 0, charaChunk)
    } else {
      newChunks.push(charaChunk)
    }
  }

  // Write PNG
  return writeChunks(newChunks)
}

/**
 * Write character card to JSON string
 *
 * @param card - Character card to write
 * @returns JSON string
 */
export function writeCardToJson(card: CharacterCard): string {
  return JSON.stringify(card, null, 2)
}

/**
 * Write character card to CHARX (ZIP) file
 *
 * @param card - Character card to write
 * @param options - Writing options with assets
 * @returns CHARX ZIP bytes
 */
export function writeCardToCharx(card: CharacterCard, options?: WriteCharxOptions): Uint8Array {
  const files = new Map<string, Uint8Array>()

  // Prepare card with asset URIs updated
  let cardCopy: CharacterCard
  try {
    cardCopy = JSON.parse(JSON.stringify(card)) as CharacterCard
  } catch (error) {
    throw new Error(`Failed to serialize card: ${(error as Error).message}`)
  }

  // Add assets if provided
  if (options?.assets) {
    cardCopy.data.assets = []
    for (const asset of options.assets) {
      const assetPath = `assets/${asset.type}/${asset.name}.${asset.ext}`
      files.set(assetPath, asset.data)
      cardCopy.data.assets.push({
        type: asset.type,
        name: asset.name,
        uri: `embeded://${assetPath}`,
        ext: asset.ext,
      })
    }
  }

  // Add card.json
  const cardJson = JSON.stringify(cardCopy, null, 2)
  files.set('card.json', encodeUTF8(cardJson))

  return createZip(files)
}

/**
 * Write standalone lorebook to PNG
 *
 * @param lorebook - Lorebook to write
 * @param imageBytes - Existing PNG image bytes
 * @returns PNG bytes with embedded lorebook
 */
export function writeLorebookToPng(lorebook: Lorebook, imageBytes: Uint8Array): Uint8Array {
  // Parse existing PNG chunks
  const chunks = readChunks(imageBytes)

  // Remove existing lorebook chunks
  const filteredChunks = chunks.filter(
    (chunk) =>
      !(
        chunk.type === 'tEXt' &&
        (getTextChunkKeyword(chunk.data) === CHUNK_KEYWORD_NAIDATA ||
          getTextChunkKeyword(chunk.data) === CHUNK_KEYWORD_CHARA)
      )
  )

  // Serialize lorebook with decorators
  const serializedLorebook = serializeLorebookDecorators(lorebook)

  // Wrap in lorebook_v3 spec
  const wrapped = {
    spec: 'lorebook_v3',
    data: serializedLorebook,
  }

  const json = JSON.stringify(wrapped)
  const utf8 = encodeUTF8(json)
  const base64 = encodeBase64(utf8)

  // Create naidata chunk
  const naidataChunk = createTextChunk(CHUNK_KEYWORD_NAIDATA, base64)

  // Find IEND chunk index
  const iendIndex = filteredChunks.findIndex((c) => c.type === 'IEND')

  // Insert before IEND
  const newChunks = [...filteredChunks]
  if (iendIndex >= 0) {
    newChunks.splice(iendIndex, 0, naidataChunk)
  } else {
    newChunks.push(naidataChunk)
  }

  return writeChunks(newChunks)
}

/**
 * Write standalone lorebook to JSON
 *
 * @param lorebook - Lorebook to write
 * @returns JSON string
 */
export function writeLorebookToJson(lorebook: Lorebook): string {
  return JSON.stringify(
    {
      spec: 'lorebook_v3',
      data: lorebook,
    },
    null,
    2
  )
}

/**
 * Get keyword from text chunk data
 */
function getTextChunkKeyword(data: Uint8Array): string {
  let keyword = ''
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) break
    keyword += String.fromCharCode(data[i] ?? 0)
  }
  return keyword
}

/**
 * Serialize decorators in card's lorebook entries back to @@syntax
 */
function serializeCardDecorators(card: CharacterCard): CharacterCard {
  if (!card.data.character_book) {
    return card
  }

  return {
    ...card,
    data: {
      ...card.data,
      character_book: serializeLorebookDecorators(card.data.character_book),
    },
  }
}

/**
 * Serialize decorators in lorebook entries back to @@syntax
 */
function serializeLorebookDecorators(lorebook: Lorebook): Lorebook {
  return {
    ...lorebook,
    entries: lorebook.entries.map((entry) => {
      if (!entry.decorators || entry.decorators.length === 0) {
        return entry
      }

      const serializedContent = serializeDecorators(entry.decorators, entry.content)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { decorators, ...rest } = entry
      return {
        ...rest,
        content: serializedContent,
      }
    }),
  }
}

/**
 * Convert V3 card to V2 format for compatibility
 */
function convertV3ToV2(card: CharacterCard): CharacterCardV2 {
  // Create V2 data, stripping V3-only fields
  const v2Data: CharacterDataV2 = {
    name: card.data.name,
    description: card.data.description,
    personality: card.data.personality,
    scenario: card.data.scenario,
    first_mes: card.data.first_mes,
    mes_example: card.data.mes_example,
    creator_notes: card.data.creator_notes,
    system_prompt: card.data.system_prompt,
    post_history_instructions: card.data.post_history_instructions,
    alternate_greetings: card.data.alternate_greetings,
    tags: card.data.tags,
    creator: card.data.creator,
    character_version: card.data.character_version,
    extensions: {
      ...card.data.extensions,
      // Store V3 fields in extensions for preservation
      ...(card.data.nickname ? { v3_nickname: card.data.nickname } : {}),
      ...(card.data.group_only_greetings.length > 0
        ? { v3_group_only_greetings: card.data.group_only_greetings }
        : {}),
      ...(card.data.assets && card.data.assets.length > 0 ? { v3_assets: card.data.assets } : {}),
    },
    ...(card.data.character_book !== undefined && { character_book: card.data.character_book }),
  }

  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: v2Data,
  }
}
