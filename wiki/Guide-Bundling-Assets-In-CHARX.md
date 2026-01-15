# Bundling Assets in CHARX

Create CHARX files that bundle character cards with images like icons, backgrounds, and emotion sprites.

## Prerequisites

Before starting, you should:

- [Understand file formats](Concept-File-Formats)
- [Know how to write cards](Guide-Writing-And-Exporting)

## Overview

We'll cover:

1. Understanding CHARX structure
2. Bundling basic assets
3. Organizing asset types
4. Reading assets from CHARX

## Step 1: Understand CHARX Structure

A CHARX file is a ZIP container:

```
character.charx
├── card.json              # The character card
└── assets/                # Asset files
    ├── icon/
    │   └── main.png       # Character icon
    ├── background/
    │   └── default.png    # Background image
    └── emotion/
        ├── neutral.png    # Emotion sprites
        ├── happy.png
        └── angry.png
```

The card's `assets` array references these files:

```json
{
  "assets": [
    { "type": "icon", "name": "main", "uri": "embeded://assets/icon/main.png", "ext": "png" }
  ]
}
```

## Step 2: Bundle Basic Assets

```typescript
import { writeCardToCharx } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Load your asset files
const iconBytes = readFileSync('images/icon.png')

// Create the CHARX with bundled assets
const charxBytes = writeCardToCharx(card, {
  assets: [
    {
      type: 'icon',
      name: 'main',
      data: iconBytes,
      ext: 'png'
    }
  ]
})

writeFileSync('character.charx', charxBytes)
```

The library automatically:
- Creates the `assets/` folder structure
- Places files at `assets/{type}/{name}.{ext}`
- Updates `card.data.assets` with `embeded://` URIs

## Step 3: Organize Asset Types

Different asset types serve different purposes:

```typescript
import { writeCardToCharx } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

const assets = [
  // Character icon (displayed in lists, chat headers)
  {
    type: 'icon',
    name: 'main',
    data: readFileSync('assets/icon.png'),
    ext: 'png'
  },

  // Background image (scene setting)
  {
    type: 'background',
    name: 'default',
    data: readFileSync('assets/background.jpg'),
    ext: 'jpg'
  },

  // Emotion sprites (expression changes)
  {
    type: 'emotion',
    name: 'neutral',
    data: readFileSync('assets/emotions/neutral.png'),
    ext: 'png'
  },
  {
    type: 'emotion',
    name: 'happy',
    data: readFileSync('assets/emotions/happy.png'),
    ext: 'png'
  },
  {
    type: 'emotion',
    name: 'angry',
    data: readFileSync('assets/emotions/angry.png'),
    ext: 'png'
  },
  {
    type: 'emotion',
    name: 'sad',
    data: readFileSync('assets/emotions/sad.png'),
    ext: 'png'
  },

  // User icon (for the human in the conversation)
  {
    type: 'user_icon',
    name: 'default',
    data: readFileSync('assets/user.png'),
    ext: 'png'
  }
]

const charx = writeCardToCharx(card, { assets })
writeFileSync('character.charx', charx)
```

### Standard Asset Types

| Type | Purpose | Common Names |
|------|---------|--------------|
| `icon` | Character portrait/avatar | `main` |
| `background` | Scene/environment image | `default`, location names |
| `emotion` | Expression sprites | `neutral`, `happy`, `sad`, `angry`, etc. |
| `user_icon` | Avatar for the user/player | `default` |

Custom types are allowed - the library doesn't validate type names.

## Step 4: Read Assets from CHARX

When you read a CHARX, embedded assets are converted to data URIs:

```typescript
import { readCardFromCharx } from '@motioneffector/cards'
import { readFileSync } from 'fs'

const charxBytes = readFileSync('character.charx')
const card = readCardFromCharx(charxBytes)

// Assets have data: URIs with the embedded content
for (const asset of card.data.assets ?? []) {
  console.log(`${asset.type}/${asset.name}: ${asset.uri.slice(0, 50)}...`)
  // "icon/main: data:application/octet-stream;base64,iVBORw0K..."

  // To use the asset, parse the data URI
  if (asset.uri.startsWith('data:')) {
    const base64 = asset.uri.split(',')[1]
    const bytes = Buffer.from(base64, 'base64')
    // Now you have the raw image bytes
  }
}
```

## Complete Example

```typescript
import { readCard, writeCardToCharx } from '@motioneffector/cards'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, extname, basename } from 'path'

// Load an existing card
const pngBytes = readFileSync('character.png')
const card = readCard(pngBytes)

// Collect all emotion sprites from a folder
const emotionDir = 'assets/emotions'
const emotionFiles = readdirSync(emotionDir).filter(f => f.endsWith('.png'))

const assets = [
  // Main icon
  {
    type: 'icon',
    name: 'main',
    data: readFileSync('assets/icon.png'),
    ext: 'png'
  },
  // All emotions
  ...emotionFiles.map(file => ({
    type: 'emotion',
    name: basename(file, extname(file)),  // 'happy.png' -> 'happy'
    data: readFileSync(join(emotionDir, file)),
    ext: 'png'
  }))
]

console.log(`Bundling ${assets.length} assets`)

const charx = writeCardToCharx(card, { assets })
writeFileSync('character.charx', charx)

console.log('Created character.charx')
```

## Variations

### Extract Assets from CHARX

```typescript
import { extractZip } from '@motioneffector/cards'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

// extractZip is a low-level utility
const charxBytes = readFileSync('character.charx')
const files = extractZip(charxBytes)

// files is Map<string, Uint8Array>
for (const [path, data] of files) {
  if (path.startsWith('assets/')) {
    const outputPath = join('extracted', path)
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, data)
    console.log(`Extracted: ${path}`)
  }
}
```

### Convert PNG Card to CHARX

```typescript
import { readCard, writeCardToCharx } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Read the PNG card
const pngBytes = readFileSync('character.png')
const card = readCard(pngBytes)

// The PNG image itself becomes the icon
const charx = writeCardToCharx(card, {
  assets: [
    { type: 'icon', name: 'main', data: pngBytes, ext: 'png' }
  ]
})

writeFileSync('character.charx', charx)
```

### CHARX Without Assets

You can create a CHARX with just the card:

```typescript
const charx = writeCardToCharx(card)  // No assets option

// Result is a ZIP with only card.json
```

## Troubleshooting

### CHARX file won't open in other apps

**Symptom:** The app rejects the CHARX file or shows no assets.

**Cause:** Apps may expect specific folder structures or naming conventions.

**Solution:** Check the app's documentation for CHARX requirements. Try extracting the ZIP to verify structure.

### Assets missing after read

**Symptom:** `card.data.assets` is empty or URIs don't contain data.

**Cause:** The assets might not have been bundled correctly, or the CHARX is malformed.

**Solution:** Extract the ZIP manually and verify assets exist. Check that `embeded://` URIs in card.json match actual paths.

### Large CHARX file size

**Symptom:** The CHARX is much larger than expected.

**Cause:** High-resolution images or many emotion sprites add up.

**Solution:** Optimize images before bundling. Consider PNG compression or WebP format (if supported by target apps).

## See Also

- **[File Formats](Concept-File-Formats)** - CHARX format details
- **[Writing & Exporting](Guide-Writing-And-Exporting)** - Other export formats
- **[Types & Interfaces](API-Types-And-Interfaces)** - Asset and AssetData types
