/**
 * Validation functions for character cards and lorebooks
 */

import type { CharacterCard, Lorebook, ValidationResult } from '../types'

/**
 * Validate a character card structure
 *
 * @param card - Card to validate
 * @param options - Validation options (strict mode)
 * @returns Validation result
 */
export function validateCard(
  card: unknown,
  options?: { strict?: boolean }
): ValidationResult {
  // Basic validation implementation
  if (!card || typeof card !== 'object') {
    return { valid: false, errors: ['Card must be an object'] }
  }

  const c = card as Record<string, unknown>

  if (c.spec !== 'chara_card_v3') {
    return { valid: false, errors: ['Invalid spec: must be "chara_card_v3"'] }
  }

  if (!c.data || typeof c.data !== 'object') {
    return { valid: false, errors: ['Missing or invalid data object'] }
  }

  // For now, basic check passes
  return { valid: true }
}

/**
 * Validate a lorebook structure
 *
 * @param lorebook - Lorebook to validate
 * @param options - Validation options (strict mode)
 * @returns Validation result
 */
export function validateLorebook(
  lorebook: unknown,
  options?: { strict?: boolean }
): ValidationResult {
  if (!lorebook || typeof lorebook !== 'object') {
    return { valid: false, errors: ['Lorebook must be an object'] }
  }

  const lb = lorebook as Record<string, unknown>

  if (!Array.isArray(lb.entries)) {
    return { valid: false, errors: ['Lorebook must have entries array'] }
  }

  return { valid: true }
}
