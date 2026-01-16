# Validation & Repair

Check card structure before saving and recover data from corrupted files.

## Prerequisites

Before starting, you should:

- [Understand the card structure](Concept-Character-Cards)
- [Know how validation and repair work](Concept-Validation-And-Repair)

## Overview

We'll cover:

1. Validating cards before saving
2. Interpreting validation errors
3. Repairing corrupted cards
4. Re-exporting repaired data

## Step 1: Validate Cards Before Saving

Run validation before writing to catch problems early:

```typescript
import { validateCard, writeCardToPng } from '@motioneffector/cards'

function safeWriteCard(card: CharacterCard, imageBytes: Uint8Array): Uint8Array {
  const result = validateCard(card)

  if (!result.valid) {
    console.error('Card validation failed:')
    for (const error of result.errors ?? []) {
      console.error(`  - ${error}`)
    }
    throw new Error('Cannot save invalid card')
  }

  return writeCardToPng(card, imageBytes)
}
```

## Step 2: Interpret Validation Errors

Validation errors describe what's wrong:

```typescript
import { validateCard } from '@motioneffector/cards'

const result = validateCard(card)

if (!result.valid) {
  for (const error of result.errors ?? []) {
    // Errors follow a pattern: "path: problem"
    // Examples:
    // "data.name: expected string, got number"
    // "data.tags: expected array"
    // "Invalid spec: expected \"chara_card_v3\""

    if (error.includes('data.name')) {
      // Fix name field
      card.data.name = String(card.data.name ?? 'Unknown')
    }
    if (error.includes('data.tags')) {
      // Fix tags field
      card.data.tags = Array.isArray(card.data.tags) ? card.data.tags : []
    }
  }
}
```

### Strict Mode

For stricter validation (publishing, quality checks):

```typescript
const result = validateCard(card, { strict: true })
```

Strict mode adds checks for:
- Unknown extension keys (warnings)
- Empty required strings
- Invalid asset URIs
- Decorator syntax issues

## Step 3: Repair Corrupted Cards

When `readCard()` fails, try repair:

```typescript
import { readCard, repairCard, ParseError } from '@motioneffector/cards'

function loadCardSafely(bytes: Uint8Array) {
  try {
    return { card: readCard(bytes), repaired: false }
  } catch (error) {
    if (error instanceof ParseError) {
      console.warn('Card is damaged, attempting repair...')

      const result = repairCard(bytes)

      // Log what happened
      for (const warning of result.warnings) {
        console.warn(`  Warning: ${warning}`)
      }

      if (result.recovered.length > 0) {
        console.log(`  Recovered: ${result.recovered.join(', ')}`)
        return { card: result.card, repaired: true, result }
      } else {
        throw new Error('Could not recover any data')
      }
    }
    throw error
  }
}
```

## Step 4: Re-export Repaired Data

After repair, write a clean card:

```typescript
import { repairCard, writeCardToPng } from '@motioneffector/cards'

function recoverAndExport(corruptedBytes: Uint8Array): Uint8Array {
  const result = repairCard(corruptedBytes)

  if (result.recovered.length === 0) {
    throw new Error('No data could be recovered')
  }

  // result.image is the original PNG without card metadata
  // result.card is the recovered V3 card

  // Re-embed the recovered card into a clean image
  return writeCardToPng(result.card, result.image)
}
```

## Complete Example

```typescript
import {
  readCard,
  validateCard,
  repairCard,
  writeCardToPng,
  ParseError
} from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

function processCard(inputPath: string, outputPath: string) {
  const bytes = readFileSync(inputPath)
  let card
  let imageBytes = bytes

  // Try normal read first
  try {
    card = readCard(bytes)
    console.log('Card loaded successfully')
  } catch (error) {
    if (!(error instanceof ParseError)) throw error

    // Attempt repair
    console.warn('Card is damaged, repairing...')
    const result = repairCard(bytes)

    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`)
    }

    if (result.recovered.length === 0) {
      throw new Error('Repair failed - no data recovered')
    }

    console.log(`Recovered: ${result.recovered.join(', ')}`)
    card = result.card
    imageBytes = result.image
  }

  // Validate before saving
  const validation = validateCard(card)
  if (!validation.valid) {
    console.warn('Validation issues:')
    for (const error of validation.errors ?? []) {
      console.warn(`  - ${error}`)
    }
    // Continue anyway - these are warnings, not blockers
  }

  // Save
  const output = writeCardToPng(card, imageBytes)
  writeFileSync(outputPath, output)
  console.log(`Saved to ${outputPath}`)
}

processCard('damaged-card.png', 'recovered-card.png')
```

## Variations

### Validate Lorebooks Separately

```typescript
import { validateLorebook } from '@motioneffector/cards'

if (card.data.character_book) {
  const result = validateLorebook(card.data.character_book)

  if (!result.valid) {
    console.error('Lorebook validation failed:', result.errors)
  }
}
```

### Check Repair Coverage

```typescript
const result = repairCard(bytes)

const criticalFields = ['name', 'description', 'first_mes']
const recovered = new Set(result.recovered)

const missing = criticalFields.filter(f => !recovered.has(f))
if (missing.length > 0) {
  console.warn(`Critical fields not recovered: ${missing.join(', ')}`)
}
```

### Batch Repair

```typescript
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

function repairDirectory(inputDir: string, outputDir: string) {
  const files = readdirSync(inputDir).filter(f => f.endsWith('.png'))

  for (const file of files) {
    const bytes = readFileSync(join(inputDir, file))
    const result = repairCard(bytes)

    if (result.recovered.length > 0) {
      const output = writeCardToPng(result.card, result.image)
      writeFileSync(join(outputDir, file), output)
      console.log(`${file}: Recovered ${result.recovered.length} fields`)
    } else {
      console.log(`${file}: No data to recover`)
    }
  }
}
```

## Troubleshooting

### Repair returns empty card

**Symptom:** `repairCard()` returns a card with all empty fields.

**Cause:** The file is completely corrupted or isn't a character card.

**Solution:** Check if `result.recovered` is empty - if so, the file may not be a character card at all.

### Validation passes but app rejects card

**Symptom:** `validateCard()` returns valid, but another app won't load the card.

**Cause:** The other app may have stricter requirements not covered by standard validation.

**Solution:** Try strict mode. Check if the app requires specific extension fields.

### Repair warnings but card works

**Symptom:** Repair logs warnings but the recovered card seems complete.

**Cause:** Normal - warnings are informational. They explain what was wrong, not what's missing.

**Solution:** Warnings are expected for damaged files. Focus on `recovered` to see what was salvaged.

## See Also

- **[Validation & Repair Concept](Concept-Validation-And-Repair)** - How it works under the hood
- **[Validation & Repair API](API-Validation-And-Repair)** - Function reference
- **[Error Classes](API-Error-Classes)** - Error types
