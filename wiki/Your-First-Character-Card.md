# Your First Character Card

Read a character card from a PNG file, modify it, and write it back.

By the end of this guide, you'll have loaded a card, changed some data, and saved it to a new PNG file.

## What We're Building

We'll take an existing character card PNG, update the character version, add a tag, and export a new PNG with the changes embedded.

## Step 1: Import the Library

```typescript
import { readCard, writeCardToPng } from '@motioneffector/cards'
```

This gives you the two main functions: `readCard()` to load cards from any format, and `writeCardToPng()` to embed card data into a PNG image.

## Step 2: Load the Card

```typescript
import { readFileSync } from 'fs'

const pngBytes = readFileSync('character.png')
const card = readCard(pngBytes)
```

`readCard()` auto-detects the format (PNG, JSON, or CHARX) and returns a normalized V3 card. Even if the file contains a V1 or V2 card, you get V3 back.

## Step 3: Access and Modify Data

```typescript
// Read existing data
console.log(`Name: ${card.data.name}`)
console.log(`Description: ${card.data.description}`)
console.log(`Tags: ${card.data.tags.join(', ')}`)

// Make changes
card.data.character_version = '1.1.0'
card.data.tags.push('modified')
```

All card data lives in `card.data`. The structure is fully typed in TypeScript, so you get autocomplete for every field.

## Step 4: Write the Updated Card

```typescript
import { writeFileSync } from 'fs'

// Use the original image as the base
const newPng = writeCardToPng(card, pngBytes)

writeFileSync('character-updated.png', newPng)
```

`writeCardToPng()` takes your card and an existing PNG image, then returns new PNG bytes with the card data embedded. The original image is preserved.

## The Complete Code

Here's everything together:

```typescript
import { readFileSync, writeFileSync } from 'fs'
import { readCard, writeCardToPng } from '@motioneffector/cards'

// Load the card
const pngBytes = readFileSync('character.png')
const card = readCard(pngBytes)

// Display current data
console.log(`Name: ${card.data.name}`)
console.log(`Description: ${card.data.description}`)

// Make changes
card.data.character_version = '1.1.0'
card.data.tags.push('modified')

// Save to new file
const newPng = writeCardToPng(card, pngBytes)
writeFileSync('character-updated.png', newPng)

console.log('Card updated and saved!')
```

## What's Next?

Now that you have the basics:

- **[Understand Character Cards](Concept-Character-Cards)** - Learn about the data structure and field meanings
- **[Work with Lorebooks](Concept-Lorebooks-And-Decorators)** - Add knowledge entries that activate during conversations
- **[Read the API Reference](API-Reading)** - Full documentation for all reading functions
