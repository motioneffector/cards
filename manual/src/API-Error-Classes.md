# Error Classes

Custom error types thrown by library functions.

---

## `CardsError`

Base error class for all library errors.

```typescript
class CardsError extends Error {
  name: 'CardsError'
}
```

All library errors extend this class, so you can catch them uniformly:

```typescript
import { CardsError } from '@motioneffector/cards'

try {
  const card = readCard(bytes)
} catch (error) {
  if (error instanceof CardsError) {
    console.error('Cards library error:', error.message)
  }
}
```

---

## `ParseError`

Thrown when parsing fails (invalid format, corrupted data, etc.).

```typescript
class ParseError extends CardsError {
  name: 'ParseError'
  position?: number
  input?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `position` | `number` | Character position where parsing failed (if applicable) |
| `input` | `string` | The input that caused the error (if applicable) |

**When thrown:**

- `readCard()` - Invalid format, corrupted data, no card data found
- `readCardFromPng()` - Invalid PNG, no card chunks
- `readCardFromJson()` - Invalid JSON, unrecognized card format
- `readCardFromCharx()` - Invalid ZIP, missing card.json
- `readLorebook()` - Invalid format, no lorebook data found

**Example:**

```typescript
import { readCard, ParseError } from '@motioneffector/cards'

try {
  const card = readCard(bytes)
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Parse failed:', error.message)

    if (error.position !== undefined) {
      console.error('At position:', error.position)
    }
  }
}
```

---

## `ValidationError`

Thrown when validation fails in strict contexts.

```typescript
class ValidationError extends CardsError {
  name: 'ValidationError'
  field?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error description |
| `field` | `string` | Field path that failed validation (if applicable) |

**When thrown:**

- `validateCard()` and `validateLorebook()` do not throw - they return `ValidationResult`
- This error is available for use in your own validation logic

**Example:**

```typescript
import { ValidationError } from '@motioneffector/cards'

function requireValidName(card: CharacterCard) {
  if (!card.data.name || card.data.name.trim() === '') {
    throw new ValidationError('Name is required', 'data.name')
  }
}

try {
  requireValidName(card)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed for ${error.field}: ${error.message}`)
  }
}
```

---

## Error Handling Patterns

### Catch All Library Errors

```typescript
import { readCard, CardsError } from '@motioneffector/cards'

try {
  const card = readCard(bytes)
} catch (error) {
  if (error instanceof CardsError) {
    // Any library error
    console.error('Library error:', error.message)
  } else {
    // Something else (system error, etc.)
    throw error
  }
}
```

### Catch Specific Errors

```typescript
import { readCard, ParseError, ValidationError } from '@motioneffector/cards'

try {
  const card = readCard(bytes, { strict: true })
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Failed to parse:', error.message)
  } else if (error instanceof ValidationError) {
    console.error('Invalid data:', error.message)
  } else {
    throw error
  }
}
```

### Graceful Fallback

```typescript
import { readCard, repairCard, ParseError } from '@motioneffector/cards'

function loadCardSafely(bytes: Uint8Array) {
  try {
    return readCard(bytes)
  } catch (error) {
    if (error instanceof ParseError) {
      console.warn('Attempting repair...')
      const result = repairCard(bytes)
      return result.card
    }
    throw error
  }
}
```
