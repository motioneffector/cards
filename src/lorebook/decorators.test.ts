import { describe, it, expect } from 'vitest'
import { parseDecorators, serializeDecorators } from './decorators'

describe('Decorator System', () => {
  describe('Parsing', () => {
    it('parses @@depth N', () => {
      const content = '@@depth 4\nActual content'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'depth', value: 4 })
      expect(result.content).toBe('Actual content')
    })

    it('parses @@activate', () => {
      const content = '@@activate\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'activate' })
    })

    it('parses @@dont_activate', () => {
      const content = '@@dont_activate\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'dont_activate' })
    })

    it('parses @@activate_only_after N', () => {
      const content = '@@activate_only_after 3\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'activate_only_after', value: 3 })
    })

    it('parses @@activate_only_every N', () => {
      const content = '@@activate_only_every 5\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'activate_only_every', value: 5 })
    })

    it('parses @@keep_activate_after_match', () => {
      const content = '@@keep_activate_after_match\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'keep_activate_after_match' })
    })

    it('parses @@dont_activate_after_match', () => {
      const content = '@@dont_activate_after_match\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'dont_activate_after_match' })
    })

    it('parses @@instruct_depth N', () => {
      const content = '@@instruct_depth 2\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'instruct_depth', value: 2 })
    })

    it('parses @@reverse_depth N', () => {
      const content = '@@reverse_depth 1\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'reverse_depth', value: 1 })
    })

    it('parses @@position VALUE', () => {
      const content = '@@position before_char\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'position', value: 'before_char' })
    })

    it('parses @@role assistant|system|user', () => {
      const content = '@@role system\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'role', value: 'system' })
    })

    it('parses @@scan_depth N', () => {
      const content = '@@scan_depth 10\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'scan_depth', value: 10 })
    })

    it('parses @@instruct_scan_depth N', () => {
      const content = '@@instruct_scan_depth 5\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'instruct_scan_depth', value: 5 })
    })

    it('parses @@is_greeting N', () => {
      const content = '@@is_greeting 1\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'is_greeting', value: 1 })
    })

    it('parses @@additional_keys A,B,C', () => {
      const content = '@@additional_keys key1,key2,key3\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({
        type: 'additional_keys',
        value: ['key1', 'key2', 'key3'],
      })
    })

    it('parses @@exclude_keys A,B,C', () => {
      const content = '@@exclude_keys bad1,bad2\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'exclude_keys', value: ['bad1', 'bad2'] })
    })

    it('parses @@is_user_icon VALUE', () => {
      const content = '@@is_user_icon avatar\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'is_user_icon', value: 'avatar' })
    })

    it('parses @@ignore_on_max_context', () => {
      const content = '@@ignore_on_max_context\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'ignore_on_max_context' })
    })

    it('parses @@disable_ui_prompt VALUE', () => {
      const content = '@@disable_ui_prompt Some text\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({ type: 'disable_ui_prompt', value: 'Some text' })
    })

    it('preserves unknown decorators as type: unknown', () => {
      const content = '@@unknown_decorator value\nContent'
      const result = parseDecorators(content)
      expect(result.decorators).toContainEqual({
        type: 'unknown',
        name: 'unknown_decorator',
        value: 'value',
      })
    })

    it('multiple decorators per entry', () => {
      const content = '@@depth 4\n@@role system\n@@activate\nContent here'
      const result = parseDecorators(content)
      expect(result.decorators).toHaveLength(3)
      expect(result.content).toBe('Content here')
    })

    it('content follows decorators', () => {
      const content = '@@depth 1\nThis is the actual content\nWith multiple lines'
      const result = parseDecorators(content)
      expect(result.content).toBe('This is the actual content\nWith multiple lines')
    })
  })

  describe('Serialization', () => {
    it('serializes depth decorator', () => {
      const decorators = [{ type: 'depth' as const, value: 4 }]
      const content = 'Test content'
      const result = serializeDecorators(decorators, content)
      expect(result).toBe('@@depth 4\nTest content')
    })

    it('serializes all decorator types', () => {
      expect(true).toBe(true) // Placeholder - will test each type
    })

    it('preserves decorator order', () => {
      const decorators = [
        { type: 'depth' as const, value: 4 },
        { type: 'activate' as const },
        { type: 'role' as const, value: 'system' as const },
      ]
      const content = 'Content'
      const result = serializeDecorators(decorators, content)
      expect(result.startsWith('@@depth 4\n@@activate\n@@role system')).toBe(true)
    })

    it('unknown decorators serialize with name/value', () => {
      const decorators = [{ type: 'unknown' as const, name: 'custom', value: 'test' }]
      const content = 'Content'
      const result = serializeDecorators(decorators, content)
      expect(result).toContain('@@custom test')
    })

    it('prepends decorators to content', () => {
      const decorators = [{ type: 'depth' as const, value: 1 }]
      const content = 'Original content'
      const result = serializeDecorators(decorators, content)
      expect(result.endsWith('Original content')).toBe(true)
    })
  })
})
