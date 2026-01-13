/**
 * Validation functions for character cards and lorebooks
 */

import type { ValidationResult, Lorebook } from '../types'

interface ValidateOptions {
  strict?: boolean
}

/**
 * Validate a character card structure
 *
 * @param card - Card to validate
 * @param options - Validation options (strict mode)
 * @returns Validation result
 */
export function validateCard(card: unknown, options?: ValidateOptions): ValidationResult {
  const errors: string[] = []
  const strict = options?.strict ?? false

  // Basic type check
  if (!card || typeof card !== 'object') {
    return { valid: false, errors: ['Card must be an object'] }
  }

  const c = card as Record<string, unknown>

  // Check spec field
  if (c.spec !== 'chara_card_v3') {
    errors.push('Invalid spec: expected "chara_card_v3"')
  }

  // Check data object
  if (!c.data || typeof c.data !== 'object') {
    return { valid: false, errors: [...errors, 'Missing or invalid data object'] }
  }

  const data = c.data as Record<string, unknown>

  // Check required string fields
  const requiredStrings = [
    'name',
    'description',
    'personality',
    'scenario',
    'first_mes',
    'mes_example',
  ]

  for (const field of requiredStrings) {
    const value = data[field]
    if (typeof value !== 'string') {
      errors.push(`data.${field}: expected string, got ${typeof value}`)
    } else if (strict && field === 'name' && value.trim() === '') {
      errors.push(`data.name: required string is empty`)
    }
  }

  // Check V2 required string fields
  const v2Strings = [
    'creator_notes',
    'system_prompt',
    'post_history_instructions',
    'creator',
    'character_version',
  ]

  for (const field of v2Strings) {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      errors.push(`data.${field}: expected string, got ${typeof data[field]}`)
    }
  }

  // Check array fields
  if (data.alternate_greetings !== undefined && !Array.isArray(data.alternate_greetings)) {
    errors.push('data.alternate_greetings: expected array')
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    errors.push('data.tags: expected array')
  }

  if (data.group_only_greetings !== undefined && !Array.isArray(data.group_only_greetings)) {
    errors.push('data.group_only_greetings: expected array')
  }

  // Check extensions object
  if (data.extensions !== undefined && typeof data.extensions !== 'object') {
    errors.push('data.extensions: expected object')
  }

  // Strict mode checks
  if (strict) {
    // Check for unknown extension keys
    if (data.extensions && typeof data.extensions === 'object') {
      const knownExtensions = new Set(['depth', 'talkativeness', 'fav'])
      const extensions = data.extensions as Record<string, unknown>
      for (const key of Object.keys(extensions)) {
        if (!knownExtensions.has(key) && !key.startsWith('v3_')) {
          errors.push(`data.extensions.${key}: unknown extension key`)
        }
      }
    }

    // Validate asset URIs
    if (data.assets && Array.isArray(data.assets)) {
      for (let i = 0; i < data.assets.length; i++) {
        const assetItem: unknown = data.assets[i]
        if (!assetItem || typeof assetItem !== 'object') continue

        const asset = assetItem as Record<string, unknown>
        if (asset.uri && typeof asset.uri === 'string') {
          const uri = asset.uri
          if (
            !uri.startsWith('http://') &&
            !uri.startsWith('https://') &&
            !uri.startsWith('data:') &&
            !uri.startsWith('embeded://') &&
            !uri.startsWith('ccdefault:')
          ) {
            errors.push(`data.assets[${String(i)}].uri: invalid URI format`)
          }
        }
      }
    }

    // Validate lorebook entry consistency
    if (data.character_book && typeof data.character_book === 'object') {
      const book = data.character_book as Lorebook
      if (Array.isArray(book.entries)) {
        for (let i = 0; i < book.entries.length; i++) {
          const entry = book.entries[i]
          if (!entry) continue

          // Check decorator syntax if decorators are present
          if (entry.decorators && Array.isArray(entry.decorators)) {
            for (const decorator of entry.decorators) {
              if (typeof decorator !== 'object') {
                errors.push(`data.character_book.entries[${String(i)}].decorators: invalid decorator`)
              }
            }
          }
        }
      }
    }
  }

  if (errors.length === 0) {
    return { valid: true }
  }
  return { valid: false, errors }
}

/**
 * Validate a lorebook structure
 *
 * @param lorebook - Lorebook to validate
 * @param options - Validation options (strict mode)
 * @returns Validation result
 */
export function validateLorebook(lorebook: unknown, _options?: ValidateOptions): ValidationResult {
  const errors: string[] = []

  if (!lorebook || typeof lorebook !== 'object') {
    return { valid: false, errors: ['Lorebook must be an object'] }
  }

  const lb = lorebook as Record<string, unknown>

  // Check entries array
  if (!Array.isArray(lb.entries)) {
    return { valid: false, errors: ['Lorebook must have entries array'] }
  }

  // Validate each entry
  for (let i = 0; i < lb.entries.length; i++) {
    const entryItem: unknown = lb.entries[i]

    if (!entryItem || typeof entryItem !== 'object') {
      errors.push(`entries[${String(i)}]: must be an object`)
      continue
    }

    const entry = entryItem as Record<string, unknown>

    // Check keys array
    if (!Array.isArray(entry.keys)) {
      errors.push(`entries[${String(i)}].keys: expected array`)
    }

    // Check content string
    if (typeof entry.content !== 'string') {
      errors.push(`entries[${String(i)}].content: expected string, got ${typeof entry.content}`)
    }

    // Check enabled boolean
    if (typeof entry.enabled !== 'boolean') {
      errors.push(`entries[${String(i)}].enabled: expected boolean, got ${typeof entry.enabled}`)
    }

    // Check insertion_order number
    if (typeof entry.insertion_order !== 'number') {
      errors.push(
        `entries[${String(i)}].insertion_order: expected number, got ${typeof entry.insertion_order}`
      )
    }

    // Check use_regex boolean
    if (typeof entry.use_regex !== 'boolean') {
      errors.push(`entries[${String(i)}].use_regex: expected boolean, got ${typeof entry.use_regex}`)
    }
  }

  // Check optional fields
  if (lb.name !== undefined && typeof lb.name !== 'string') {
    errors.push('name: expected string')
  }

  if (lb.description !== undefined && typeof lb.description !== 'string') {
    errors.push('description: expected string')
  }

  if (lb.scan_depth !== undefined && typeof lb.scan_depth !== 'number') {
    errors.push('scan_depth: expected number')
  }

  if (lb.token_budget !== undefined && typeof lb.token_budget !== 'number') {
    errors.push('token_budget: expected number')
  }

  if (lb.recursive_scanning !== undefined && typeof lb.recursive_scanning !== 'boolean') {
    errors.push('recursive_scanning: expected boolean')
  }

  // Check extensions
  if (lb.extensions !== undefined && typeof lb.extensions !== 'object') {
    errors.push('extensions: expected object')
  }

  if (errors.length === 0) {
    return { valid: true }
  }
  return { valid: false, errors }
}
