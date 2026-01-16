# Reading API

Functions for loading character cards and lorebooks from various formats.

---

## `readCard()`

Load a character card from any supported format (PNG, JSON, or CHARX) with automatic format detection.

**Signature:**

```typescript
function readCard(
  data: Uint8Array | string,
  options?: ReadOptions
): CharacterCard
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Uint8Array \| string` | Yes | File bytes (PNG/CHARX) or JSON string |
| `options` | `ReadOptions` | No | Reading options |

**Returns:** `CharacterCard` — The parsed card normalized to V3 format.

**Example:**

```typescript
import { readCard } from '@motioneffector/cards'

// From PNG bytes
const card = readCard(pngBytes)

// From JSON string
const card = readCard('{"spec":"chara_card_v3",...}')

// With options
const card = readCard(bytes, { strict: true, parseDecorators: false })
```

**Throws:**

- `ParseError` — When the format is unrecognized or parsing fails

---

## `readCardFromPng()`

Load a character card specifically from PNG bytes.

**Signature:**

```typescript
function readCardFromPng(
  bytes: Uint8Array,
  options?: ReadOptions
): CharacterCard
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bytes` | `Uint8Array` | Yes | PNG file bytes |
| `options` | `ReadOptions` | No | Reading options |

**Returns:** `CharacterCard` — The parsed card normalized to V3 format.

**Example:**

```typescript
import { readCardFromPng } from '@motioneffector/cards'

const card = readCardFromPng(pngBytes)
```

**Throws:**

- `ParseError` — When the file is not a valid PNG or contains no card data

---

## `readCardFromJson()`

Load a character card from a JSON string.

**Signature:**

```typescript
function readCardFromJson(
  json: string,
  options?: ReadOptions
): CharacterCard
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `json` | `string` | Yes | JSON string containing card data |
| `options` | `ReadOptions` | No | Reading options |

**Returns:** `CharacterCard` — The parsed card normalized to V3 format.

**Example:**

```typescript
import { readCardFromJson } from '@motioneffector/cards'

const json = '{"spec":"chara_card_v3","spec_version":"3.0","data":{...}}'
const card = readCardFromJson(json)
```

**Throws:**

- `ParseError` — When JSON is invalid or doesn't contain valid card data

---

## `readCardFromCharx()`

Load a character card from CHARX (ZIP container) bytes.

**Signature:**

```typescript
function readCardFromCharx(
  bytes: Uint8Array,
  options?: ReadOptions
): CharacterCard
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bytes` | `Uint8Array` | Yes | CHARX file bytes |
| `options` | `ReadOptions` | No | Reading options |

**Returns:** `CharacterCard` — The parsed card normalized to V3 format. Embedded assets are converted to data URIs.

**Example:**

```typescript
import { readCardFromCharx } from '@motioneffector/cards'

const card = readCardFromCharx(charxBytes)

// Assets have data: URIs
for (const asset of card.data.assets ?? []) {
  console.log(asset.uri) // "data:application/octet-stream;base64,..."
}
```

**Throws:**

- `ParseError` — When the file is not a valid ZIP or missing card.json

---

## `readLorebook()`

Load a standalone lorebook from PNG or JSON.

**Signature:**

```typescript
function readLorebook(
  data: Uint8Array | string,
  options?: ReadOptions
): Lorebook
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Uint8Array \| string` | Yes | PNG bytes or JSON string |
| `options` | `ReadOptions` | No | Reading options |

**Returns:** `Lorebook` — The parsed lorebook (not wrapped in a card).

**Example:**

```typescript
import { readLorebook } from '@motioneffector/cards'

// From PNG (NovelAI-style)
const lorebook = readLorebook(pngBytes)

// From JSON
const lorebook = readLorebook('{"spec":"lorebook_v3","data":{...}}')

console.log(`Entries: ${lorebook.entries.length}`)
```

**Throws:**

- `ParseError` — When the format is invalid or contains no lorebook data

---

## Types

### `ReadOptions`

```typescript
interface ReadOptions {
  strict?: boolean
  parseDecorators?: boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `strict` | `boolean` | `false` | Throw on invalid data instead of best-effort parsing |
| `parseDecorators` | `boolean` | `true` | Parse `@@decorators` in lorebook entry content |
