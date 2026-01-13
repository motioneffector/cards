/**
 * Type definitions for Character Card V3 parser
 */

/**
 * Character Card V3 top-level structure
 */
export interface CharacterCard {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: CharacterData
}

/**
 * Character Card V2 top-level structure (for reading legacy cards)
 */
export interface CharacterCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: CharacterDataV2
}

/**
 * Character Card V1 (no spec wrapper, legacy format)
 */
export type CharacterCardV1 = CharacterDataV1

/**
 * Character data for V3 cards
 */
export interface CharacterData {
  // V1 base fields (required)
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string

  // V2 additions
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  tags: string[]
  creator: string
  character_version: string
  extensions: Record<string, unknown>

  // V3 additions
  nickname?: string
  creator_notes_multilingual?: Record<string, string>
  source?: string[]
  group_only_greetings: string[]
  creation_date?: number
  modification_date?: number
  assets?: Asset[]
  character_book?: Lorebook
}

/**
 * Character data for V2 cards (for reading and compatibility)
 */
export interface CharacterDataV2 {
  // V1 base fields
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string

  // V2 additions
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  tags: string[]
  creator: string
  character_version: string
  extensions: Record<string, unknown>
  character_book?: Lorebook
}

/**
 * Character data for V1 cards (legacy)
 */
export interface CharacterDataV1 {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
}

/**
 * Asset metadata for V3 cards
 */
export interface Asset {
  type: string
  uri: string
  name: string
  ext: string
}

/**
 * Lorebook (embedded or standalone)
 */
export interface Lorebook {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions: Record<string, unknown>
  entries: LorebookEntry[]
}

/**
 * Standalone lorebook wrapper
 */
export interface StandaloneLorebook {
  spec: 'lorebook_v3'
  data: Lorebook
}

/**
 * Lorebook entry
 */
export interface LorebookEntry {
  // Required fields
  keys: string[]
  content: string
  enabled: boolean
  insertion_order: number
  use_regex: boolean
  extensions: Record<string, unknown>

  // Optional fields
  id?: string | number
  name?: string
  comment?: string
  priority?: number
  case_sensitive?: boolean
  selective?: boolean
  secondary_keys?: string[]
  constant?: boolean
  position?: string

  // V3 parsed decorators
  decorators?: Decorator[]
}

/**
 * Decorator types for V3 lorebook entries
 */
export type Decorator =
  // Activation
  | { type: 'activate' }
  | { type: 'dont_activate' }
  | { type: 'activate_only_after'; value: number }
  | { type: 'activate_only_every'; value: number }
  | { type: 'keep_activate_after_match' }
  | { type: 'dont_activate_after_match' }
  // Position
  | { type: 'depth'; value: number }
  | { type: 'instruct_depth'; value: number }
  | { type: 'reverse_depth'; value: number }
  | { type: 'position'; value: string }
  | { type: 'role'; value: 'assistant' | 'system' | 'user' }
  // Scanning
  | { type: 'scan_depth'; value: number }
  | { type: 'instruct_scan_depth'; value: number }
  | { type: 'is_greeting'; value: number }
  // Matching
  | { type: 'additional_keys'; value: string[] }
  | { type: 'exclude_keys'; value: string[] }
  | { type: 'is_user_icon'; value: string }
  // UI
  | { type: 'ignore_on_max_context' }
  | { type: 'disable_ui_prompt'; value: string }
  // Unknown (preserve)
  | { type: 'unknown'; name: string; value?: string }

/**
 * Options for reading cards
 */
export interface ReadOptions {
  /** Throw on invalid data instead of returning partial results */
  strict?: boolean
  /** Parse @@decorators in lorebook entries (default: true) */
  parseDecorators?: boolean
}

/**
 * Options for writing cards to PNG
 */
export interface WritePngOptions {
  /** Also write V2 compatible chunk (default: true) */
  includeV2Chunk?: boolean
  /** Serialize decorators back to @@syntax (default: true) */
  serializeDecorators?: boolean
}

/**
 * Asset data for writing to CHARX
 */
export interface AssetData {
  type: string
  name: string
  data: Uint8Array
  ext: string
}

/**
 * Options for writing CHARX files
 */
export interface WriteCharxOptions {
  assets?: AssetData[]
}

/**
 * Result of repair operation
 */
export interface RepairResult {
  /** Recovered card data in V3 format */
  card: CharacterCard
  /** Clean image bytes without metadata */
  image: Uint8Array
  /** Issues found during repair */
  warnings: string[]
  /** Fields successfully recovered */
  recovered: string[]
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors?: string[]
}

/**
 * PNG chunk structure
 */
export interface PngChunk {
  length: number
  type: string
  data: Uint8Array
  crc: number
}

/**
 * Extracted card data from PNG
 */
export interface ExtractedCardData {
  json: CharacterCard | CharacterCardV2 | CharacterCardV1
  keyword: string
  chunkIndex: number
}
