# Utilities API

Low-level utility functions for encoding and PNG operations.

---

## `encodeBase64()`

Encode bytes to Base64 string.

**Signature:**

```typescript
function encodeBase64(bytes: Uint8Array): string
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `bytes` | `Uint8Array` | Yes | Bytes to encode |

**Returns:** `string` — Base64-encoded string.

**Example:**

```typescript
import { encodeBase64 } from '@motioneffector/cards'

const bytes = new Uint8Array([72, 101, 108, 108, 111])
const base64 = encodeBase64(bytes)
// "SGVsbG8="
```

---

## `decodeBase64()`

Decode Base64 string to bytes.

**Signature:**

```typescript
function decodeBase64(base64: string): Uint8Array
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `base64` | `string` | Yes | Base64-encoded string |

**Returns:** `Uint8Array` — Decoded bytes.

**Example:**

```typescript
import { decodeBase64 } from '@motioneffector/cards'

const bytes = decodeBase64('SGVsbG8=')
// Uint8Array [72, 101, 108, 108, 111]
```

**Throws:**

- `Error` — When the input is not valid Base64

---

## `computeCRC32()`

Compute CRC-32 checksum for PNG chunk validation.

**Signature:**

```typescript
function computeCRC32(type: Uint8Array, data: Uint8Array): number
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `type` | `Uint8Array` | Yes | 4-byte chunk type (e.g., "tEXt" as bytes) |
| `data` | `Uint8Array` | Yes | Chunk data bytes |

**Returns:** `number` — CRC-32 checksum as unsigned 32-bit integer.

**Example:**

```typescript
import { computeCRC32 } from '@motioneffector/cards'

const type = new Uint8Array([116, 69, 88, 116]) // "tEXt"
const data = new Uint8Array([...]) // chunk data

const crc = computeCRC32(type, data)
```

---

## Notes

These utilities are exported for advanced use cases. Most applications won't need them directly:

- **Base64**: Used internally for PNG text chunk encoding. May be useful if you're handling raw card data strings.

- **CRC-32**: Used internally for PNG chunk validation. Useful if you're implementing custom PNG manipulation.

The library handles all encoding and checksum computation automatically when you use the high-level read/write functions.
