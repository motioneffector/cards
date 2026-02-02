# @motioneffector/cards

A TypeScript library for parsing and writing Character Card V3 and Lorebook data.

[![npm version](https://img.shields.io/npm/v/@motioneffector/cards.svg)](https://www.npmjs.com/package/@motioneffector/cards)
[![license](https://img.shields.io/npm/l/@motioneffector/cards.svg)](https://github.com/motioneffector/cards/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)


## Features

- **Multi-format Support** - PNG, JSON, and CHARX container formats
- **Version Compatibility** - Read V1/V2/V3 cards, write V3 format
- **Decorator Parsing** - Parse and serialize V3 lorebook decorators
- **Lorebook Handling** - Embedded and standalone lorebook support
- **Repair & Recovery** - Best-effort recovery of malformed cards
- **Validation** - Permissive and strict validation modes
- **Zero Dependencies** - No external libraries, no supply chain risk

[Read the full manual →](https://motioneffector.github.io/cards/manual/)

## Quick Start

```typescript
import { readCard, writeCardToPng } from '@motioneffector/cards'

// Read from any format (PNG, JSON, or CHARX)
const card = readCard(fileBytes)

// Access card data
console.log(card.data.name)
console.log(card.data.description)

// Write to PNG format
const pngBytes = writeCardToPng(card, imagePngBytes)

// Parse lorebook decorators
import { parseDecorators } from '@motioneffector/cards'
const { decorators, content } = parseDecorators(entry.content)
```

## Testing & Validation

- **Comprehensive test suite** - 312 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
