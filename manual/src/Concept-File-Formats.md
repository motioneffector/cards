# File Formats

Character cards can be stored in three container formats: PNG images with embedded metadata, raw JSON files, and CHARX ZIP bundles. The library auto-detects which format you're dealing with, so you can use `readCard()` on any of them.

## How It Works

### PNG Format

The most common format. Card data is embedded in the image's metadata as a tEXt chunk. The image displays normally in any image viewer, but applications that understand character cards can extract the embedded data.

```
PNG File
├── Image data (what you see)
└── tEXt chunks (invisible metadata)
    ├── ccv3: [base64-encoded V3 card JSON]
    └── chara: [base64-encoded V2 card JSON] (compatibility)
```

V3 cards use the `ccv3` keyword. Legacy V2/V1 cards use `chara`. When writing, the library includes both chunks by default for maximum compatibility.

### JSON Format

Raw JSON files containing the card structure directly. Useful for editing cards in text editors or storing them in databases.

```json
{
  "spec": "chara_card_v3",
  "spec_version": "3.0",
  "data": {
    "name": "Character Name",
    "description": "...",
    ...
  }
}
```

### CHARX Format

A ZIP container that bundles the card JSON with asset files (icons, backgrounds, emotion sprites). The file extension is `.charx` but it's a standard ZIP file.

```
character.charx (ZIP)
├── card.json           # The character card
└── assets/             # Embedded assets
    ├── icon/
    │   └── main.png
    └── emotion/
        ├── happy.png
        └── sad.png
```

Asset URIs in the card reference embedded files:
```json
{
  "assets": [
    { "type": "icon", "name": "main", "uri": "embeded://assets/icon/main.png", "ext": "png" }
  ]
}
```

## Basic Usage

```typescript
import { readCard } from '@motioneffector/cards'

// Auto-detect format from bytes or string
const card = readCard(pngBytes)    // PNG file
const card = readCard(jsonString)  // JSON string
const card = readCard(charxBytes)  // CHARX ZIP

// Format-specific functions if you know the type
import { readCardFromPng, readCardFromJson, readCardFromCharx } from '@motioneffector/cards'

const card = readCardFromPng(pngBytes)
const card = readCardFromJson(jsonString)
const card = readCardFromCharx(charxBytes)
```

Writing works the same way:

```typescript
import { writeCardToPng, writeCardToJson, writeCardToCharx } from '@motioneffector/cards'

// Write to PNG (requires an existing image)
const pngBytes = writeCardToPng(card, originalImageBytes)

// Write to JSON
const jsonString = writeCardToJson(card)

// Write to CHARX with assets
const charxBytes = writeCardToCharx(card, {
  assets: [
    { type: 'icon', name: 'main', data: iconPngBytes, ext: 'png' }
  ]
})
```

## Key Points

- **Auto-detection** - `readCard()` examines the first few bytes to determine format. PNG starts with a specific signature, ZIP (CHARX) starts with `PK`, everything else is assumed to be JSON.

- **V2 compatibility chunk** - When writing to PNG, `writeCardToPng()` includes a `chara` chunk with V2-compatible data by default. This ensures older applications can still read your cards. Disable with `{ includeV2Chunk: false }`.

- **Lorebook formats** - Standalone lorebooks can also be PNG or JSON. PNG lorebooks use the `naidata` keyword (NovelAI format) or `chara` keyword.

- **Base64 encoding** - In PNG files, card data is base64-encoded. The library handles encoding/decoding automatically.

## Examples

### Checking Format Before Reading

```typescript
function detectFormat(bytes: Uint8Array): 'png' | 'charx' | 'unknown' {
  // PNG signature: 0x89 0x50 0x4E 0x47
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return 'png'
  }
  // ZIP signature: 0x50 0x4B (PK)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return 'charx'
  }
  return 'unknown'
}

// But you usually don't need this - just call readCard()
const card = readCard(bytes) // Works for all formats
```

### Converting Between Formats

```typescript
import { readCard, writeCardToPng, writeCardToJson, writeCardToCharx } from '@motioneffector/cards'

// Read from any format
const card = readCard(inputBytes)

// Write to all formats
const asPng = writeCardToPng(card, blankImageBytes)
const asJson = writeCardToJson(card)
const asCharx = writeCardToCharx(card)
```

### Reading Standalone Lorebooks

```typescript
import { readLorebook } from '@motioneffector/cards'

// From PNG (NovelAI-style)
const lorebook = readLorebook(lorebookPngBytes)

// From JSON
const lorebook = readLorebook(lorebookJsonString)
```

## Related

- **[Reading Cards](Guide-Reading-Cards)** - Detailed guide on loading cards
- **[Writing & Exporting](Guide-Writing-And-Exporting)** - Detailed guide on saving cards
- **[Bundling Assets in CHARX](Guide-Bundling-Assets-In-CHARX)** - Working with CHARX containers
