/**
 * @motioneffector/cards - Character Card V3 and Lorebook parser
 *
 * Public API exports
 */

// Error classes
export { CardsError, ParseError, ValidationError } from './errors'

// Reading functions
export { readCard, readCardFromPng, readCardFromJson, readCardFromCharx, readLorebook } from './read'

// Writing functions
export {
  writeCardToPng,
  writeCardToJson,
  writeCardToCharx,
  writeLorebookToPng,
  writeLorebookToJson,
} from './write'

// Repair and validation
export { repairCard } from './repair'
export { validateCard, validateLorebook } from './validate'

// Decorator parsing and serialization
export { parseDecorators, serializeDecorators } from './lorebook/decorators'

// Utility functions
export { computeCRC32 } from './png/crc'
export { encodeBase64, decodeBase64 } from './utils/base64'

// Type definitions
export type {
  CharacterCard,
  CharacterCardV2,
  CharacterCardV1,
  CharacterData,
  CharacterDataV2,
  CharacterDataV1,
  Lorebook,
  StandaloneLorebook,
  LorebookEntry,
  Decorator,
  Asset,
  AssetData,
  ReadOptions,
  WritePngOptions,
  WriteCharxOptions,
  RepairResult,
  ValidationResult,
  PngChunk,
  ExtractedCardData,
} from './types'
