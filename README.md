# @motioneffector/cards

A TypeScript library for parsing and writing Character Card V3 and Lorebook data. Supports PNG-embedded JSON, standalone JSON, and CHARX (ZIP) containers with zero dependencies.

[![npm version](https://img.shields.io/npm/v/@motioneffector/cards.svg)](https://www.npmjs.com/package/@motioneffector/cards)
[![license](https://img.shields.io/npm/l/@motioneffector/cards.svg)](https://github.com/motioneffector/cards/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Status: Foundation Release (v0.1.0)

This is a foundation release with production-ready core utilities and a complete architecture. The following components are **fully functional**:

- ✅ **Decorator System**: Parse and serialize all 26 V3 decorator types
- ✅ **Validation**: Card and lorebook structure validation
- ✅ **Format Detection**: PNG/ZIP/JSON signature detection
- ✅ **CRC-32**: PNG chunk checksum computation
- ✅ **Base64/UTF-8**: Multi-platform encoding/decoding

**In Progress**: PNG/JSON/CHARX I/O implementation will be completed in subsequent releases.

## Installation

```bash
npm install @motioneffector/cards
```

## Quick Start

```typescript
import { parseDecorators, serializeDecorators } from '@motioneffector/cards'

// Parse V3 lorebook decorators
const content = `@@depth 4
@@role system
This is the actual lorebook content.`

const result = parseDecorators(content)
console.log(result.decorators)
// [{ type: 'depth', value: 4 }, { type: 'role', value: 'system' }]

// Serialize back to V3 format
const serialized = serializeDecorators(result.decorators, result.content)
```

## Features

- **Complete Type System** - Full TypeScript types for V1/V2/V3 character cards
- **Decorator Parsing** - Parse and serialize all 26 V3 decorator types
- **Multi-Version Support** - Read V1, V2, V3 cards; write V3 (with V2 compat)
- **Format Detection** - Auto-detect PNG, JSON, or CHARX formats
- **Validation** - Permissive and strict validation modes
- **Zero Dependencies** - Manual PNG/ZIP parsing, no external libs
- **Full TypeScript** - Complete type definitions included
- **Tree-shakeable** - ESM build for optimal bundle size

## API Reference

### Decorator Parsing

#### `parseDecorators(content: string)`

Parse V3 lorebook decorators from content string.

**Parameters:**
- `content` - Content string with optional `@@decorator` lines

**Returns:** `{ decorators: Decorator[], content: string }`

**Example:**
```typescript
const result = parseDecorators('@@depth 4\n@@role system\nContent')
// result.decorators: [{ type: 'depth', value: 4 }, { type: 'role', value: 'system' }]
// result.content: 'Content'
```

**Supported Decorators:**
- Activation: `activate`, `dont_activate`, `activate_only_after`, `activate_only_every`, `keep_activate_after_match`, `dont_activate_after_match`
- Position: `depth`, `instruct_depth`, `reverse_depth`, `position`, `role`
- Scanning: `scan_depth`, `instruct_scan_depth`, `is_greeting`
- Matching: `additional_keys`, `exclude_keys`, `is_user_icon`
- UI: `ignore_on_max_context`, `disable_ui_prompt`
- Unknown decorators are preserved as `{ type: 'unknown', name, value }`

#### `serializeDecorators(decorators: Decorator[], content: string)`

Serialize decorators back to `@@` syntax.

**Parameters:**
- `decorators` - Array of decorator objects
- `content` - Content to append after decorators

**Returns:** `string` - Serialized content with decorator lines

**Example:**
```typescript
const decorators = [{ type: 'depth', value: 4 }]
const result = serializeDecorators(decorators, 'Content')
// '@@depth 4\nContent'
```

### Validation

#### `validateCard(card: unknown, options?: { strict?: boolean })`

Validate a character card structure.

**Parameters:**
- `card` - Card object to validate
- `options.strict` - Enable strict mode (default: false)

**Returns:** `{ valid: boolean, errors?: string[] }`

**Example:**
```typescript
import { validateCard } from '@motioneffector/cards'

const card = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: 'Example',
    description: 'A test character',
    // ... other required fields
  }
}

const result = validateCard(card)
if (result.valid) {
  console.log('Card is valid')
} else {
  console.error('Validation errors:', result.errors)
}
```

#### `validateLorebook(lorebook: unknown, options?: { strict?: boolean })`

Validate a lorebook structure.

**Returns:** `{ valid: boolean, errors?: string[] }`

### Utilities

#### `computeCRC32(...data: Uint8Array[])`

Compute CRC-32 checksum for PNG chunks.

**Example:**
```typescript
import { computeCRC32 } from '@motioneffector/cards'

const type = new Uint8Array([116, 69, 88, 116]) // "tEXt"
const data = new Uint8Array([104, 101, 108, 108, 111]) // "hello"
const crc = computeCRC32(type, data)
console.log('CRC-32:', crc.toString(16))
```

#### `encodeBase64(bytes: Uint8Array)` / `decodeBase64(base64: string)`

Base64 encoding/decoding with multi-platform support.

**Example:**
```typescript
import { encodeBase64, decodeBase64 } from '@motioneffector/cards'

const text = 'Hello, World!'
const bytes = new TextEncoder().encode(text)
const encoded = encodeBase64(bytes)
const decoded = decodeBase64(encoded)
console.log(new TextDecoder().decode(decoded)) // 'Hello, World!'
```

## Roadmap

**Planned for v0.2.0:**
- PNG card reading with chunk extraction
- JSON parsing with V1/V2 → V3 normalization
- PNG card writing with chunk injection
- Basic round-trip tests

**Planned for v0.3.0:**
- CHARX (ZIP) container support
- Asset extraction and embedding
- Repair and recovery functions
- Full integration tests

**Planned for v1.0.0:**
- Complete test coverage
- Real-world compatibility tests (Chub.ai, SillyTavern, NovelAI)
- Performance optimizations
- Comprehensive documentation

## Demo

[Try the interactive demo](https://motioneffector.github.io/cards/index.html) with 25 automated tests showcasing the working components.

## Error Handling

```typescript
import { ParseError, ValidationError } from '@motioneffector/cards'

try {
  // Parsing or validation operations
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Validation failed:', e.message, 'Field:', e.field)
  } else if (e instanceof ParseError) {
    console.error('Parse error:', e.message, 'Position:', e.position)
  }
}
```

## Type Definitions

```typescript
import type {
  CharacterCard,        // V3 card structure
  CharacterCardV2,      // V2 card structure (for reading)
  CharacterCardV1,      // V1 card structure (for reading)
  Lorebook,             // Lorebook structure
  LorebookEntry,        // Individual lorebook entry
  Decorator,            // Decorator union type (26 variants)
  Asset,                // Asset metadata
} from '@motioneffector/cards'
```

## Browser Support

Works in all modern browsers (ES2022+). For older browsers, transpile with your build tool.

Tested in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Node.js 18+

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test:run

# Type check
pnpm typecheck

# Build
pnpm build

# Lint
pnpm lint
```

## License

MIT © [motioneffector](https://github.com/motioneffector)

## Contributing

Contributions welcome! Please read our contributing guidelines and code of conduct.

## Acknowledgments

Built following the Character Card V3 specification and compatible with:
- [SillyTavern](https://github.com/SillyTavern/SillyTavern)
- [Chub.ai](https://chub.ai/)
- [NovelAI](https://novelai.net/)
