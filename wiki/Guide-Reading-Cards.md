# Reading Cards

Load character cards from PNG images, JSON files, or CHARX containers. The library auto-detects format and normalizes everything to V3.

## Prerequisites

Before starting, you should:

- [Have the library installed](Installation)
- Understand [what character cards contain](Concept-Character-Cards)

## Overview

We'll cover:

1. Loading cards with auto-detection
2. Using format-specific functions
3. Reading standalone lorebooks
4. Handling read options

## Step 1: Load a Card with Auto-Detection

The simplest approach - let `readCard()` figure out the format:

```typescript
import { readCard } from '@motioneffector/cards'
import { readFileSync } from 'fs'

// Works for PNG, JSON, or CHARX
const bytes = readFileSync('character.png')
const card = readCard(bytes)

console.log(card.data.name)
```

For JSON stored as a string:

```typescript
const jsonString = '{"spec":"chara_card_v3",...}'
const card = readCard(jsonString)
```

The function examines the input to determine format:
- `Uint8Array` starting with PNG signature → PNG
- `Uint8Array` starting with `PK` → CHARX (ZIP)
- `string` → JSON

## Step 2: Use Format-Specific Functions

When you know the format, use the specific function for clearer code:

```typescript
import {
  readCardFromPng,
  readCardFromJson,
  readCardFromCharx
} from '@motioneffector/cards'

// PNG file
const pngCard = readCardFromPng(pngBytes)

// JSON string
const jsonCard = readCardFromJson(jsonString)

// CHARX file
const charxCard = readCardFromCharx(charxBytes)
```

These throw `ParseError` if the format doesn't match.

## Step 3: Read Standalone Lorebooks

Lorebooks can exist as separate files (not embedded in a card):

```typescript
import { readLorebook } from '@motioneffector/cards'

// From PNG (NovelAI-style lorebook image)
const lorebook = readLorebook(lorebookPngBytes)

// From JSON
const lorebook = readLorebook(lorebookJsonString)

console.log(`Entries: ${lorebook.entries.length}`)
```

Standalone lorebooks use the `Lorebook` type, not wrapped in a card structure.

## Step 4: Configure Read Options

Control parsing behavior with options:

```typescript
const card = readCard(bytes, {
  strict: true,          // Throw on invalid data instead of best-effort parsing
  parseDecorators: true, // Parse @@decorators in lorebook entries (default: true)
})
```

### Strict Mode

By default, the library is permissive - it tries to read whatever it can. Strict mode throws errors on:
- Invalid CRC checksums in PNG chunks
- Unrecognized card formats

```typescript
import { readCard, ParseError } from '@motioneffector/cards'

try {
  const card = readCard(bytes, { strict: true })
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Card is malformed:', error.message)
  }
}
```

### Disable Decorator Parsing

If you want raw lorebook content without parsing `@@` decorators:

```typescript
const card = readCard(bytes, { parseDecorators: false })

// entry.content will include the @@decorator lines
// entry.decorators will be undefined
```

## Complete Example

```typescript
import { readCard, ParseError } from '@motioneffector/cards'
import { readFileSync } from 'fs'

function loadCard(filePath: string) {
  const bytes = readFileSync(filePath)

  try {
    const card = readCard(bytes)

    console.log(`Loaded: ${card.data.name}`)
    console.log(`Creator: ${card.data.creator || 'Unknown'}`)
    console.log(`Tags: ${card.data.tags.join(', ') || 'None'}`)

    if (card.data.character_book) {
      console.log(`Lorebook entries: ${card.data.character_book.entries.length}`)
    }

    return card
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(`Failed to parse ${filePath}: ${error.message}`)
    }
    throw error
  }
}
```

## Variations

### Reading from URL (Browser)

```typescript
async function loadCardFromUrl(url: string) {
  const response = await fetch(url)
  const bytes = new Uint8Array(await response.arrayBuffer())
  return readCard(bytes)
}
```

### Reading from Base64

```typescript
import { readCard, decodeBase64 } from '@motioneffector/cards'

const base64String = 'iVBORw0KGgo...'
const bytes = decodeBase64(base64String)
const card = readCard(bytes)
```

### Batch Reading

```typescript
import { readCard } from '@motioneffector/cards'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

function loadAllCards(directory: string) {
  const files = readdirSync(directory).filter(f => f.endsWith('.png'))

  return files.map(file => {
    const bytes = readFileSync(join(directory, file))
    try {
      return { file, card: readCard(bytes) }
    } catch {
      return { file, card: null, error: 'Failed to parse' }
    }
  })
}
```

## Troubleshooting

### ParseError: No character card data found

**Symptom:** Reading a PNG throws "No character card data found in PNG"

**Cause:** The PNG doesn't contain embedded card data - it's just a regular image.

**Solution:** Verify the file is actually a character card, not just an image of a character.

### ParseError: Invalid JSON

**Symptom:** Reading throws "Invalid JSON"

**Cause:** The file contents aren't valid JSON, or the base64 decoding produced garbage.

**Solution:** For JSON files, check for syntax errors. For PNG files, the embedded data may be corrupted - try `repairCard()`.

### Unexpected V1/V2 Fields

**Symptom:** A card parsed from an old source has empty V3 fields.

**Cause:** Normal behavior - V1/V2 cards don't have V3 fields, so they're set to defaults.

**Solution:** This is expected. Check for undefined/empty before using optional fields.

## See Also

- **[File Formats](Concept-File-Formats)** - How cards are stored in different formats
- **[Validation & Repair](Guide-Validation-And-Repair)** - Handling corrupted cards
- **[Reading API](API-Reading)** - Full function reference
