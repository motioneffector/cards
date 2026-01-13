/**
 * Decorator parsing and serialization for V3 lorebook entries
 */

import type { Decorator } from '../types'

export interface ParsedDecorators {
  decorators: Decorator[]
  content: string
}

/**
 * Parse decorators from lorebook entry content
 *
 * Decorators are lines starting with @@ at the beginning of content
 *
 * @param content - Raw entry content with potential decorators
 * @returns Parsed decorators and cleaned content
 */
export function parseDecorators(content: string): ParsedDecorators {
  const lines = content.split('\n')
  const decorators: Decorator[] = []
  let contentStartIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? ''
    if (!line.startsWith('@@')) {
      contentStartIndex = i
      break
    }

    // Parse decorator line
    const decorator = parseDecoratorLine(line)
    if (decorator) {
      decorators.push(decorator)
    }
  }

  const cleanContent = lines.slice(contentStartIndex).join('\n')

  return {
    decorators,
    content: cleanContent,
  }
}

/**
 * Serialize decorators back to @@syntax
 *
 * @param decorators - Decorators to serialize
 * @param content - Content to append after decorators
 * @returns Serialized string with decorators
 */
export function serializeDecorators(decorators: Decorator[], content: string): string {
  const lines: string[] = []

  for (const decorator of decorators) {
    const line = serializeDecoratorLine(decorator)
    if (line) {
      lines.push(line)
    }
  }

  if (lines.length > 0) {
    lines.push(content)
    return lines.join('\n')
  }

  return content
}

/**
 * Parse a single decorator line
 */
function parseDecoratorLine(line: string): Decorator | null {
  // Remove @@ prefix
  const text = line.slice(2).trim()
  const parts = text.split(/\s+/)
  const name = parts[0]
  const value = parts.slice(1).join(' ')

  if (!name) return null

  switch (name) {
    case 'activate':
      return { type: 'activate' }
    case 'dont_activate':
      return { type: 'dont_activate' }
    case 'activate_only_after':
      return { type: 'activate_only_after', value: parseInt(value, 10) }
    case 'activate_only_every':
      return { type: 'activate_only_every', value: parseInt(value, 10) }
    case 'keep_activate_after_match':
      return { type: 'keep_activate_after_match' }
    case 'dont_activate_after_match':
      return { type: 'dont_activate_after_match' }
    case 'depth':
      return { type: 'depth', value: parseInt(value, 10) }
    case 'instruct_depth':
      return { type: 'instruct_depth', value: parseInt(value, 10) }
    case 'reverse_depth':
      return { type: 'reverse_depth', value: parseInt(value, 10) }
    case 'position':
      return { type: 'position', value }
    case 'role':
      return { type: 'role', value: value as 'assistant' | 'system' | 'user' }
    case 'scan_depth':
      return { type: 'scan_depth', value: parseInt(value, 10) }
    case 'instruct_scan_depth':
      return { type: 'instruct_scan_depth', value: parseInt(value, 10) }
    case 'is_greeting':
      return { type: 'is_greeting', value: parseInt(value, 10) }
    case 'additional_keys':
      return { type: 'additional_keys', value: value.split(',').map(k => k.trim()) }
    case 'exclude_keys':
      return { type: 'exclude_keys', value: value.split(',').map(k => k.trim()) }
    case 'is_user_icon':
      return { type: 'is_user_icon', value }
    case 'ignore_on_max_context':
      return { type: 'ignore_on_max_context' }
    case 'disable_ui_prompt':
      return { type: 'disable_ui_prompt', value }
    default:
      return { type: 'unknown', name, value }
  }
}

/**
 * Serialize a single decorator to line
 */
function serializeDecoratorLine(decorator: Decorator): string | null {
  switch (decorator.type) {
    case 'activate':
      return '@@activate'
    case 'dont_activate':
      return '@@dont_activate'
    case 'activate_only_after':
      return `@@activate_only_after ${decorator.value}`
    case 'activate_only_every':
      return `@@activate_only_every ${decorator.value}`
    case 'keep_activate_after_match':
      return '@@keep_activate_after_match'
    case 'dont_activate_after_match':
      return '@@dont_activate_after_match'
    case 'depth':
      return `@@depth ${decorator.value}`
    case 'instruct_depth':
      return `@@instruct_depth ${decorator.value}`
    case 'reverse_depth':
      return `@@reverse_depth ${decorator.value}`
    case 'position':
      return `@@position ${decorator.value}`
    case 'role':
      return `@@role ${decorator.value}`
    case 'scan_depth':
      return `@@scan_depth ${decorator.value}`
    case 'instruct_scan_depth':
      return `@@instruct_scan_depth ${decorator.value}`
    case 'is_greeting':
      return `@@is_greeting ${decorator.value}`
    case 'additional_keys':
      return `@@additional_keys ${decorator.value.join(',')}`
    case 'exclude_keys':
      return `@@exclude_keys ${decorator.value.join(',')}`
    case 'is_user_icon':
      return `@@is_user_icon ${decorator.value}`
    case 'ignore_on_max_context':
      return '@@ignore_on_max_context'
    case 'disable_ui_prompt':
      return `@@disable_ui_prompt ${decorator.value}`
    case 'unknown':
      return decorator.value ? `@@${decorator.name} ${decorator.value}` : `@@${decorator.name}`
    default:
      return null
  }
}
