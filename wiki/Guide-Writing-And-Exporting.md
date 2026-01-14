# Writing & Exporting

Save character cards to PNG images, JSON files, or CHARX containers. Choose the format based on how the card will be used.

## Prerequisites

Before starting, you should:

- [Understand character card structure](Concept-Character-Cards)
- [Know the different file formats](Concept-File-Formats)

## Overview

We'll cover:

1. Writing to PNG (most common)
2. Writing to JSON
3. Writing to CHARX with assets
4. Writing standalone lorebooks

## Step 1: Write to PNG

PNG is the most portable format - the image displays normally, but applications can extract the embedded card.

```typescript
import { writeCardToPng } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// You need an existing PNG image
const imageBytes = readFileSync('base-image.png')

// Embed the card into the image
const cardPng = writeCardToPng(card, imageBytes)

writeFileSync('character.png', cardPng)
```

The original image is preserved - only metadata chunks are added/replaced.

### PNG Write Options

```typescript
const cardPng = writeCardToPng(card, imageBytes, {
  includeV2Chunk: true,      // Also write 'chara' chunk for V2 compatibility (default: true)
  serializeDecorators: true, // Convert decorator arrays back to @@syntax (default: true)
})
```

Setting `includeV2Chunk: false` reduces file size slightly but breaks compatibility with V2-only applications like older SillyTavern versions.

## Step 2: Write to JSON

JSON is useful for editing cards in text editors, storing in databases, or debugging.

```typescript
import { writeCardToJson } from '@motioneffector/cards'
import { writeFileSync } from 'fs'

const jsonString = writeCardToJson(card)

writeFileSync('character.json', jsonString)
```

The output is pretty-printed with 2-space indentation.

## Step 3: Write to CHARX with Assets

CHARX bundles the card with asset files (icons, backgrounds, emotions) in a ZIP container.

```typescript
import { writeCardToCharx } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Load your asset files
const iconBytes = readFileSync('icon.png')
const happyBytes = readFileSync('emotions/happy.png')
const sadBytes = readFileSync('emotions/sad.png')

// Bundle everything
const charxBytes = writeCardToCharx(card, {
  assets: [
    { type: 'icon', name: 'main', data: iconBytes, ext: 'png' },
    { type: 'emotion', name: 'happy', data: happyBytes, ext: 'png' },
    { type: 'emotion', name: 'sad', data: sadBytes, ext: 'png' },
  ]
})

writeFileSync('character.charx', charxBytes)
```

The card's `assets` array is automatically updated with `embeded://` URIs pointing to the bundled files.

## Step 4: Write Standalone Lorebooks

Lorebooks can be exported separately from cards.

```typescript
import { writeLorebookToPng, writeLorebookToJson } from '@motioneffector/cards'

// To PNG (NovelAI-compatible)
const lorebookPng = writeLorebookToPng(lorebook, baseImageBytes)
writeFileSync('lorebook.png', lorebookPng)

// To JSON
const lorebookJson = writeLorebookToJson(lorebook)
writeFileSync('lorebook.json', lorebookJson)
```

## Complete Example

```typescript
import {
  readCard,
  writeCardToPng,
  writeCardToJson,
  writeCardToCharx
} from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Load and modify a card
const originalBytes = readFileSync('character.png')
const card = readCard(originalBytes)

card.data.character_version = '2.0.0'
card.data.tags.push('updated')

// Export to all formats
const asPng = writeCardToPng(card, originalBytes)
writeFileSync('character-v2.png', asPng)

const asJson = writeCardToJson(card)
writeFileSync('character-v2.json', asJson)

const asCharx = writeCardToCharx(card)
writeFileSync('character-v2.charx', asCharx)

console.log('Exported to PNG, JSON, and CHARX')
```

## Variations

### Creating a New Card from Scratch

```typescript
import type { CharacterCard } from '@motioneffector/cards'
import { writeCardToPng } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

const card: CharacterCard = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: 'New Character',
    description: 'A character description.',
    personality: 'Personality traits.',
    scenario: 'The setting.',
    first_mes: 'Hello!',
    mes_example: '',
    creator_notes: '',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: [],
    tags: ['new'],
    creator: 'your-name',
    character_version: '1.0.0',
    extensions: {},
    group_only_greetings: [],
  }
}

const baseImage = readFileSync('blank.png')
const cardPng = writeCardToPng(card, baseImage)
writeFileSync('new-character.png', cardPng)
```

### Stripping V2 Compatibility for Smaller Files

```typescript
const cardPng = writeCardToPng(card, imageBytes, {
  includeV2Chunk: false  // Only write ccv3 chunk
})
```

This reduces file size but older applications won't be able to read the card.

### Preserving Raw Decorator Content

If you want to keep `@@decorator` lines in content without serializing:

```typescript
// Read without parsing decorators
const card = readCard(bytes, { parseDecorators: false })

// Modify...

// Write - decorators stay as raw text in content
const output = writeCardToPng(card, imageBytes, {
  serializeDecorators: false
})
```

## Troubleshooting

### Output file is the same size as input

**Symptom:** The PNG file size barely changed after adding card data.

**Cause:** Normal - card JSON is base64-encoded and added as metadata. For small cards, this adds only a few KB.

**Solution:** No action needed. Large lorebooks can add significant size.

### Card data not appearing in other applications

**Symptom:** Other apps don't see the card after you wrote it.

**Cause:** The app might only support V2 format, and you disabled the V2 chunk.

**Solution:** Ensure `includeV2Chunk: true` (the default) when writing.

### CHARX file won't open

**Symptom:** Applications reject the CHARX file.

**Cause:** The app might expect specific asset paths or card.json structure.

**Solution:** Verify the app's CHARX requirements. Try extracting the ZIP manually to inspect contents.

## See Also

- **[File Formats](Concept-File-Formats)** - Format details and structure
- **[Format Compatibility](Guide-Format-Compatibility)** - Ensuring V2 app compatibility
- **[Bundling Assets in CHARX](Guide-Bundling-Assets-In-CHARX)** - Detailed CHARX guide
- **[Writing API](API-Writing)** - Full function reference
