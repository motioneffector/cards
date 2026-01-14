# Writing API

Functions for saving character cards and lorebooks to various formats.

---

## `writeCardToPng()`

Embed a character card into a PNG image.

**Signature:**

```typescript
function writeCardToPng(
  card: CharacterCard,
  imageBytes: Uint8Array,
  options?: WritePngOptions
): Uint8Array
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `card` | `CharacterCard` | Yes | The card to embed |
| `imageBytes` | `Uint8Array` | Yes | Existing PNG image bytes |
| `options` | `WritePngOptions` | No | Writing options |

**Returns:** `Uint8Array` — PNG bytes with embedded card data.

**Example:**

```typescript
import { writeCardToPng } from '@motioneffector/cards'

const pngWithCard = writeCardToPng(card, baseImageBytes)

// With options
const pngV3Only = writeCardToPng(card, baseImageBytes, {
  includeV2Chunk: false,
  serializeDecorators: true
})
```

**Throws:**

- `Error` — When imageBytes is not a valid PNG

---

## `writeCardToJson()`

Serialize a character card to JSON string.

**Signature:**

```typescript
function writeCardToJson(card: CharacterCard): string
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `card` | `CharacterCard` | Yes | The card to serialize |

**Returns:** `string` — Pretty-printed JSON string.

**Example:**

```typescript
import { writeCardToJson } from '@motioneffector/cards'

const json = writeCardToJson(card)
// Returns formatted JSON with 2-space indentation
```

---

## `writeCardToCharx()`

Create a CHARX (ZIP container) with the card and optional assets.

**Signature:**

```typescript
function writeCardToCharx(
  card: CharacterCard,
  options?: WriteCharxOptions
): Uint8Array
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `card` | `CharacterCard` | Yes | The card to bundle |
| `options` | `WriteCharxOptions` | No | Assets to include |

**Returns:** `Uint8Array` — ZIP file bytes.

**Example:**

```typescript
import { writeCardToCharx } from '@motioneffector/cards'

// Without assets
const charx = writeCardToCharx(card)

// With assets
const charx = writeCardToCharx(card, {
  assets: [
    { type: 'icon', name: 'main', data: iconBytes, ext: 'png' },
    { type: 'emotion', name: 'happy', data: happyBytes, ext: 'png' }
  ]
})
```

---

## `writeLorebookToPng()`

Embed a standalone lorebook into a PNG image.

**Signature:**

```typescript
function writeLorebookToPng(
  lorebook: Lorebook,
  imageBytes: Uint8Array
): Uint8Array
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `lorebook` | `Lorebook` | Yes | The lorebook to embed |
| `imageBytes` | `Uint8Array` | Yes | Existing PNG image bytes |

**Returns:** `Uint8Array` — PNG bytes with embedded lorebook data (uses `naidata` chunk).

**Example:**

```typescript
import { writeLorebookToPng } from '@motioneffector/cards'

const lorebookPng = writeLorebookToPng(lorebook, baseImageBytes)
```

---

## `writeLorebookToJson()`

Serialize a standalone lorebook to JSON string.

**Signature:**

```typescript
function writeLorebookToJson(lorebook: Lorebook): string
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `lorebook` | `Lorebook` | Yes | The lorebook to serialize |

**Returns:** `string` — Pretty-printed JSON string with `lorebook_v3` wrapper.

**Example:**

```typescript
import { writeLorebookToJson } from '@motioneffector/cards'

const json = writeLorebookToJson(lorebook)
// Returns: {"spec":"lorebook_v3","data":{...}}
```

---

## Types

### `WritePngOptions`

```typescript
interface WritePngOptions {
  includeV2Chunk?: boolean
  serializeDecorators?: boolean
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `includeV2Chunk` | `boolean` | `true` | Also write `chara` chunk for V2 app compatibility |
| `serializeDecorators` | `boolean` | `true` | Convert decorator arrays back to `@@` syntax in content |

### `WriteCharxOptions`

```typescript
interface WriteCharxOptions {
  assets?: AssetData[]
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `assets` | `AssetData[]` | `undefined` | Assets to bundle in the CHARX |

### `AssetData`

```typescript
interface AssetData {
  type: string
  name: string
  data: Uint8Array
  ext: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Asset type: `'icon'`, `'background'`, `'emotion'`, etc. |
| `name` | `string` | Asset identifier: `'main'`, `'happy'`, `'sad'`, etc. |
| `data` | `Uint8Array` | Raw file bytes |
| `ext` | `string` | File extension: `'png'`, `'jpg'`, `'webp'`, etc. |
