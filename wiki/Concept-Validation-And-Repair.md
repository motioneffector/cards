# Validation & Repair

Validation checks if a card has the correct structure and field types. Repair attempts to recover data from corrupted or malformed cards. Use validation before saving to catch problems early; use repair when loading fails and you want to salvage what you can.

## How It Works

### Validation

Validation examines a card object and reports whether it conforms to the V3 spec:

```
Card object ─→ validateCard() ─→ { valid: true }
                              or { valid: false, errors: [...] }
```

Two modes are available:
- **Permissive (default)** - Checks required fields exist and have correct types. Allows unknown fields.
- **Strict** - All permissive checks plus: warns on unknown extensions, validates asset URIs, checks for empty required strings.

### Repair

Repair takes potentially corrupted bytes and does everything possible to extract card data:

```
Corrupted PNG bytes ─→ repairCard() ─→ {
                                         card: CharacterCard,  // Best-effort recovery
                                         image: Uint8Array,    // Clean image (no metadata)
                                         warnings: string[],   // What went wrong
                                         recovered: string[]   // Fields we saved
                                       }
```

Repair strategies include:
- Ignoring CRC errors in PNG chunks
- Recovering truncated base64 data
- Parsing malformed UTF-8
- Extracting partial JSON fields
- Merging data from multiple chunks

## Basic Usage

```typescript
import { validateCard, validateLorebook, repairCard } from '@motioneffector/cards'

// Validate a card
const result = validateCard(card)
if (result.valid) {
  console.log('Card is valid')
} else {
  console.log('Validation errors:', result.errors)
}

// Strict validation
const strictResult = validateCard(card, { strict: true })

// Validate a lorebook
const lbResult = validateLorebook(lorebook)

// Repair a corrupted file
const repairResult = repairCard(corruptedBytes)
console.log('Warnings:', repairResult.warnings)
console.log('Recovered fields:', repairResult.recovered)

// Use the recovered card
const card = repairResult.card
```

## Key Points

- **Validation doesn't modify** - It only reports problems; it doesn't fix them. Use it to check cards before saving or after programmatic modifications.

- **Repair always returns something** - Even if recovery fails completely, you get an empty card structure. Check `recovered` to see what was actually salvaged.

- **Repair strips metadata** - The `image` in repair results is the original PNG with all card chunks removed. Use this to re-embed a clean card.

- **Strict mode is optional** - Default validation is intentionally permissive. Strict mode is for when you want to enforce best practices or catch potential issues.

## Examples

### Validating Before Save

```typescript
import { validateCard, writeCardToPng } from '@motioneffector/cards'

function saveCard(card: CharacterCard, imageBytes: Uint8Array): Uint8Array {
  const result = validateCard(card)

  if (!result.valid) {
    throw new Error(`Invalid card: ${result.errors?.join(', ')}`)
  }

  return writeCardToPng(card, imageBytes)
}
```

### Handling Validation Errors

```typescript
const result = validateCard(card)

if (!result.valid) {
  for (const error of result.errors ?? []) {
    if (error.includes('data.name')) {
      console.error('Name field is invalid')
    } else if (error.includes('data.description')) {
      console.error('Description field is invalid')
    } else {
      console.error('Other error:', error)
    }
  }
}
```

### Recovering a Corrupted Card

```typescript
import { repairCard, writeCardToPng } from '@motioneffector/cards'

function recoverCard(corruptedBytes: Uint8Array): Uint8Array | null {
  const result = repairCard(corruptedBytes)

  // Log what happened
  if (result.warnings.length > 0) {
    console.warn('Repair warnings:')
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`)
    }
  }

  // Check if we got anything useful
  if (result.recovered.length === 0) {
    console.error('No data could be recovered')
    return null
  }

  console.log('Recovered fields:', result.recovered.join(', '))

  // Re-export as clean card
  return writeCardToPng(result.card, result.image)
}
```

### Strict Validation for Publishing

```typescript
import { validateCard } from '@motioneffector/cards'

function validateForPublishing(card: CharacterCard): string[] {
  const result = validateCard(card, { strict: true })

  const issues: string[] = []

  if (!result.valid) {
    issues.push(...(result.errors ?? []))
  }

  // Additional publishing checks
  if (card.data.name.trim() === '') {
    issues.push('Name cannot be empty')
  }
  if (card.data.description.length < 50) {
    issues.push('Description should be at least 50 characters')
  }
  if (card.data.tags.length === 0) {
    issues.push('At least one tag is recommended')
  }

  return issues
}
```

## Related

- **[Validation & Repair Guide](Guide-Validation-And-Repair)** - Step-by-step walkthrough
- **[Validation & Repair API](API-Validation-And-Repair)** - Function reference
- **[Error Classes](API-Error-Classes)** - ValidationError details
