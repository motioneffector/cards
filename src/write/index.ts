/**
 * Card writing functions
 */

import type {
  CharacterCard,
  Lorebook,
  WritePngOptions,
  WriteCharxOptions,
} from '../types'

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
  throw new Error('Not implemented')
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
export function writeCardToCharx(
  card: CharacterCard,
  options?: WriteCharxOptions
): Uint8Array {
  throw new Error('Not implemented')
}

/**
 * Write standalone lorebook to PNG
 *
 * @param lorebook - Lorebook to write
 * @param imageBytes - Existing PNG image bytes
 * @returns PNG bytes with embedded lorebook
 */
export function writeLorebookToPng(
  lorebook: Lorebook,
  imageBytes: Uint8Array
): Uint8Array {
  throw new Error('Not implemented')
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
