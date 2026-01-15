# Format Compatibility

Ensure your cards work with V2 applications like SillyTavern, Chub.ai, and other character card tools.

## Prerequisites

Before starting, you should:

- [Understand file formats](Concept-File-Formats)
- [Know how to write cards](Guide-Writing-And-Exporting)

## Overview

We'll cover:

1. How V2 compatibility works
2. Enabling and disabling V2 chunks
3. What data is preserved in V2
4. Testing with common applications

## Step 1: Understand V2 Compatibility

When you write a PNG card, the library embeds two chunks by default:

```
PNG File
├── ccv3 chunk (V3 format - full data)
└── chara chunk (V2 format - compatibility)
```

V3-aware applications read the `ccv3` chunk. Older V2-only applications read the `chara` chunk. Both chunks contain the card data, but V2 has limitations:

- No V3-only fields (nickname, group_only_greetings, assets, etc.)
- V3 fields are stored in `extensions` for preservation
- Decorators are serialized back to `@@` syntax in content

## Step 2: Control V2 Chunk Generation

The V2 chunk is included by default:

```typescript
import { writeCardToPng } from '@motioneffector/cards'

// Default: includes both ccv3 and chara chunks
const png = writeCardToPng(card, imageBytes)

// Explicit: include V2 chunk
const pngWithV2 = writeCardToPng(card, imageBytes, {
  includeV2Chunk: true
})

// Skip V2 chunk (smaller file, V3-only)
const pngV3Only = writeCardToPng(card, imageBytes, {
  includeV2Chunk: false
})
```

Only disable V2 compatibility if you're certain all consumers support V3.

## Step 3: Understand V2 Data Mapping

V3 data maps to V2 like this:

| V3 Field | V2 Location |
|----------|-------------|
| name, description, personality, etc. | data.* (same) |
| creator_notes, system_prompt, etc. | data.* (same) |
| tags, alternate_greetings | data.* (same) |
| character_book | data.character_book (same) |
| **nickname** | data.extensions.v3_nickname |
| **group_only_greetings** | data.extensions.v3_group_only_greetings |
| **assets** | data.extensions.v3_assets |
| **creation_date** | Omitted |
| **modification_date** | Omitted |

When a V2 app reads and writes the card, V3 data is preserved in extensions.

### Decorator Handling

Decorators in lorebook entries are serialized back to `@@` syntax:

```typescript
// V3 entry (parsed)
{
  content: "The secret base is underground.",
  decorators: [{ type: 'depth', value: 4 }]
}

// V2 entry (serialized)
{
  content: "@@depth 4\nThe secret base is underground."
}
```

V2 apps pass through `@@` lines unchanged. When you read the card again, decorators are re-parsed.

## Step 4: Test with Common Applications

### SillyTavern

SillyTavern reads the `chara` chunk. With V2 compatibility enabled:

- All V1/V2 fields display correctly
- Character book (lorebook) works normally
- V3 fields are stored in extensions (hidden but preserved)

### Chub.ai

Chub.ai primarily uses V2 format. With V2 compatibility:

- Cards upload and display correctly
- Metadata (creator, version, tags) appears properly
- Downloads preserve V2 data; V3 extensions may be lost on re-download

### NovelAI

NovelAI uses V1-style format for characters and a different lorebook format (`naidata`). For maximum compatibility:

- Use `writeLorebookToPng()` for standalone lorebooks (writes `naidata` chunk)
- Character cards work but may lose some fields

## Complete Example

```typescript
import { readCard, writeCardToPng, writeCardToJson } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Load a V3 card
const bytes = readFileSync('character-v3.png')
const card = readCard(bytes)

// Check for V3-only features
const hasV3Features =
  card.data.nickname ||
  card.data.group_only_greetings.length > 0 ||
  (card.data.assets && card.data.assets.length > 0)

if (hasV3Features) {
  console.log('Card uses V3 features:')
  if (card.data.nickname) console.log(`  - Nickname: ${card.data.nickname}`)
  if (card.data.group_only_greetings.length > 0)
    console.log(`  - ${card.data.group_only_greetings.length} group-only greetings`)
  if (card.data.assets?.length)
    console.log(`  - ${card.data.assets.length} assets`)

  console.log('These will be stored in V2 extensions.')
}

// Export with V2 compatibility
const output = writeCardToPng(card, bytes, {
  includeV2Chunk: true,
  serializeDecorators: true
})

writeFileSync('character-compatible.png', output)
console.log('Saved with V2 compatibility')
```

## Variations

### Force V3-Only for Modern Apps

```typescript
// For apps that fully support V3, skip the overhead
const output = writeCardToPng(card, imageBytes, {
  includeV2Chunk: false
})

// Smaller file, but won't work in SillyTavern < 1.12.0 etc.
```

### Inspect V2 Compatibility Chunk

```typescript
import { readCardFromPng } from '@motioneffector/cards'

// The library always returns V3, but you can examine what V2 apps see
// by looking at what's stored in extensions when round-tripping

const card = readCardFromPng(pngBytes)

if (card.data.extensions.v3_nickname) {
  console.log('V3 nickname is preserved:', card.data.extensions.v3_nickname)
}
```

### Reading V2 Cards

Old V2 cards are automatically normalized to V3:

```typescript
const card = readCard(oldV2PngBytes)

// card.spec is 'chara_card_v3'
// V2 fields are in their normal locations
// V3 fields have defaults (empty strings, empty arrays)
```

## Troubleshooting

### Card appears in V2 app but data is wrong

**Symptom:** V2 app shows the card but fields are missing or garbled.

**Cause:** The V2 chunk may have encoding issues or the app has parsing bugs.

**Solution:** Export to JSON and compare. Try with a different V2 app to isolate the issue.

### V3 features lost after round-trip through V2 app

**Symptom:** Uploading to a V2 site and re-downloading loses V3 data.

**Cause:** The V2 app may strip unknown extension keys.

**Solution:** This is a limitation of V2 apps. Keep your original V3 file. Some V2 apps preserve extensions correctly.

### Lorebook decorators not working in V2 app

**Symptom:** `@@depth` and other decorators are ignored.

**Cause:** The V2 app may not support decorator syntax.

**Solution:** Decorators are a V3 feature. V2 apps that don't parse `@@` lines will include them as literal text. There's no workaround except using an app that supports decorators.

## See Also

- **[File Formats](Concept-File-Formats)** - Format structure details
- **[Writing & Exporting](Guide-Writing-And-Exporting)** - Write options reference
- **[Character Cards](Concept-Character-Cards)** - Field differences between versions
