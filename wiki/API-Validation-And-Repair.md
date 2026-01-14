# Validation & Repair API

Functions for checking card structure and recovering corrupted data.

---

## `validateCard()`

Check if a card object conforms to the V3 specification.

**Signature:**

```typescript
function validateCard(
  card: unknown,
  options?: { strict?: boolean }
): ValidationResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `card` | `unknown` | Yes | The card object to validate |
| `options` | `{ strict?: boolean }` | No | Validation options |

**Returns:** `ValidationResult` — Validation result with errors if invalid.

**Example:**

```typescript
import { validateCard } from '@motioneffector/cards'

const result = validateCard(card)
if (result.valid) {
  console.log('Card is valid')
} else {
  console.log('Errors:', result.errors)
}

// Strict mode
const strictResult = validateCard(card, { strict: true })
```

---

## `validateLorebook()`

Check if a lorebook object conforms to the specification.

**Signature:**

```typescript
function validateLorebook(
  lorebook: unknown,
  options?: { strict?: boolean }
): ValidationResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `lorebook` | `unknown` | Yes | The lorebook object to validate |
| `options` | `{ strict?: boolean }` | No | Validation options |

**Returns:** `ValidationResult` — Validation result with errors if invalid.

**Example:**

```typescript
import { validateLorebook } from '@motioneffector/cards'

const result = validateLorebook(lorebook)
if (!result.valid) {
  console.log('Lorebook errors:', result.errors)
}
```

---

## `repairCard()`

Attempt to recover data from a corrupted or malformed character card PNG.

**Signature:**

```typescript
function repairCard(bytes: Uint8Array): RepairResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bytes` | `Uint8Array` | Yes | Possibly corrupted PNG bytes |

**Returns:** `RepairResult` — Recovered card, clean image, and diagnostic information.

**Example:**

```typescript
import { repairCard, writeCardToPng } from '@motioneffector/cards'

const result = repairCard(corruptedBytes)

console.log('Warnings:', result.warnings)
console.log('Recovered:', result.recovered)

// Re-export the repaired card
const cleanPng = writeCardToPng(result.card, result.image)
```

---

## Types

### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  errors?: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | Whether the data is valid |
| `errors` | `string[]` | List of validation errors (only if invalid) |

### `RepairResult`

```typescript
interface RepairResult {
  card: CharacterCard
  image: Uint8Array
  warnings: string[]
  recovered: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `card` | `CharacterCard` | Best-effort recovered card in V3 format |
| `image` | `Uint8Array` | Original PNG with all card metadata removed |
| `warnings` | `string[]` | Issues encountered during repair |
| `recovered` | `string[]` | Field names that were successfully recovered |

### Validation Modes

**Permissive (default):**
- Checks required fields exist
- Checks types are correct
- Allows unknown fields
- Allows missing optional fields

**Strict (`{ strict: true }`):**
- All permissive checks plus:
- Warns on unknown extension keys
- Warns on empty required strings
- Validates asset URIs
- Checks decorator syntax
- Validates lorebook entry consistency
