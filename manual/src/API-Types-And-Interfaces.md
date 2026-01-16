# Types & Interfaces

Type definitions for all data structures used by the library.

---

## CharacterCard

The top-level V3 character card structure.

```typescript
interface CharacterCard {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  data: CharacterData
}
```

| Property | Type | Description |
|----------|------|-------------|
| `spec` | `'chara_card_v3'` | Format identifier (always this value) |
| `spec_version` | `'3.0'` | Version string (always this value) |
| `data` | `CharacterData` | The character data |

---

## CharacterData

Character information and metadata.

```typescript
interface CharacterData {
  // V1 base fields (required)
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string

  // V2 additions
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  tags: string[]
  creator: string
  character_version: string
  extensions: Record<string, unknown>

  // V3 additions
  nickname?: string
  creator_notes_multilingual?: Record<string, string>
  source?: string[]
  group_only_greetings: string[]
  creation_date?: number
  modification_date?: number
  assets?: Asset[]
  character_book?: Lorebook
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Character's name |
| `description` | `string` | Yes | Character description/background |
| `personality` | `string` | Yes | Personality traits |
| `scenario` | `string` | Yes | The situation/context |
| `first_mes` | `string` | Yes | Opening message |
| `mes_example` | `string` | Yes | Example dialogue format |
| `creator_notes` | `string` | Yes | Notes from the creator |
| `system_prompt` | `string` | Yes | System prompt override |
| `post_history_instructions` | `string` | Yes | Instructions after history |
| `alternate_greetings` | `string[]` | Yes | Alternative opening messages |
| `tags` | `string[]` | Yes | Categorization tags |
| `creator` | `string` | Yes | Creator name/identifier |
| `character_version` | `string` | Yes | Version string |
| `extensions` | `Record<string, unknown>` | Yes | App-specific data |
| `nickname` | `string` | No | Display name override |
| `creator_notes_multilingual` | `Record<string, string>` | No | Localized creator notes |
| `source` | `string[]` | No | Source URLs |
| `group_only_greetings` | `string[]` | Yes | Greetings for group chats |
| `creation_date` | `number` | No | Unix timestamp |
| `modification_date` | `number` | No | Unix timestamp |
| `assets` | `Asset[]` | No | Bundled assets |
| `character_book` | `Lorebook` | No | Embedded lorebook |

---

## Asset

Asset metadata for images bundled with the card.

```typescript
interface Asset {
  type: string
  uri: string
  name: string
  ext: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Asset type: `'icon'`, `'background'`, `'emotion'`, `'user_icon'`, etc. |
| `uri` | `string` | Location: URL, data URI, `'ccdefault:'`, or `'embeded://path'` |
| `name` | `string` | Asset identifier: `'main'`, `'happy'`, `'sad'`, etc. |
| `ext` | `string` | File extension: `'png'`, `'jpg'`, `'webp'`, etc. |

---

## Lorebook

Knowledge database structure.

```typescript
interface Lorebook {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions: Record<string, unknown>
  entries: LorebookEntry[]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | No | Lorebook name |
| `description` | `string` | No | Lorebook description |
| `scan_depth` | `number` | No | How far back to scan for triggers |
| `token_budget` | `number` | No | Maximum tokens to use |
| `recursive_scanning` | `boolean` | No | Scan activated entries for more triggers |
| `extensions` | `Record<string, unknown>` | Yes | App-specific data |
| `entries` | `LorebookEntry[]` | Yes | Lorebook entries |

---

## StandaloneLorebook

Wrapper for standalone lorebook files.

```typescript
interface StandaloneLorebook {
  spec: 'lorebook_v3'
  data: Lorebook
}
```

---

## LorebookEntry

Individual lorebook entry.

```typescript
interface LorebookEntry {
  // Required fields
  keys: string[]
  content: string
  enabled: boolean
  insertion_order: number
  use_regex: boolean
  extensions: Record<string, unknown>

  // Optional fields
  id?: string | number
  name?: string
  comment?: string
  priority?: number
  case_sensitive?: boolean
  selective?: boolean
  secondary_keys?: string[]
  constant?: boolean
  position?: string

  // V3 parsed decorators
  decorators?: Decorator[]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `keys` | `string[]` | Yes | Trigger keywords |
| `content` | `string` | Yes | Content to inject |
| `enabled` | `boolean` | Yes | Whether entry is active |
| `insertion_order` | `number` | Yes | Priority (lower = first) |
| `use_regex` | `boolean` | Yes | Keys are regex patterns |
| `extensions` | `Record<string, unknown>` | Yes | App-specific data |
| `id` | `string \| number` | No | Entry identifier |
| `name` | `string` | No | Entry name |
| `comment` | `string` | No | Internal comment |
| `priority` | `number` | No | Activation priority |
| `case_sensitive` | `boolean` | No | Case-sensitive matching |
| `selective` | `boolean` | No | Require secondary keys |
| `secondary_keys` | `string[]` | No | Additional required keys |
| `constant` | `boolean` | No | Always active |
| `position` | `string` | No | Insertion position |
| `decorators` | `Decorator[]` | No | Parsed V3 decorators |

---

## Decorator

See [Decorator API](API-Decorator) for the full type definition.

---

## Legacy Types

### CharacterCardV2

```typescript
interface CharacterCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: CharacterDataV2
}
```

### CharacterCardV1

```typescript
type CharacterCardV1 = CharacterDataV1

interface CharacterDataV1 {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
}
```

These are used internally for parsing. The library normalizes all cards to V3.

---

## PNG Types

### PngChunk

```typescript
interface PngChunk {
  length: number
  type: string
  data: Uint8Array
  crc: number
}
```

### ExtractedCardData

```typescript
interface ExtractedCardData {
  json: CharacterCard | CharacterCardV2 | CharacterCardV1
  keyword: string
  chunkIndex: number
}
```
