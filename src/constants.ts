/**
 * Constants used throughout the library
 */

/** PNG file signature (magic bytes) */
export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** PNG chunk type for text metadata */
export const PNG_CHUNK_TEXT = 'tEXt'

/** PNG chunk type for end of image */
export const PNG_CHUNK_IEND = 'IEND'

/** PNG chunk keywords */
export const CHUNK_KEYWORD_CCv3 = 'ccv3'
export const CHUNK_KEYWORD_CHARA = 'chara'
export const CHUNK_KEYWORD_NAIDATA = 'naidata'

/** Character Card spec strings */
export const SPEC_V3 = 'chara_card_v3'
export const SPEC_V2 = 'chara_card_v2'
export const SPEC_V1 = undefined // V1 has no spec field

/** Lorebook spec string */
export const SPEC_LOREBOOK_V3 = 'lorebook_v3'

/** Character Card spec versions */
export const SPEC_VERSION_V3 = '3.0'
export const SPEC_VERSION_V2 = '2.0'
