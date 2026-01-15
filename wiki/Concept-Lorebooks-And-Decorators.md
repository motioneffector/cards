# Lorebooks & Decorators

A lorebook is a knowledge database that injects context into conversations when trigger keywords are detected. Entries activate automatically based on what's being discussed, adding relevant world-building, character knowledge, or instructions to the AI's context.

## How It Works

Each lorebook entry has:
- **Keys** - Words or phrases that trigger the entry
- **Content** - Text that gets inserted into the prompt
- **Settings** - Whether it's enabled, regex matching, insertion order

When a user or character message contains a trigger key, that entry's content is added to the AI's context. This lets you build deep lore without bloating the main character description.

```
User message: "Tell me about the Crystal Tower"
                    ↓
Lorebook scans for keywords
                    ↓
Entry with key "Crystal Tower" found
                    ↓
Entry content added to context:
"The Crystal Tower is an ancient spire in the northern mountains.
 It was built by the Archmage Valdris 2000 years ago..."
```

## Basic Usage

```typescript
import { readCard } from '@motioneffector/cards'

const card = readCard(fileBytes)

// Access embedded lorebook
if (card.data.character_book) {
  const lorebook = card.data.character_book

  console.log(`Lorebook: ${lorebook.name ?? 'Unnamed'}`)
  console.log(`Entries: ${lorebook.entries.length}`)

  for (const entry of lorebook.entries) {
    console.log(`  Keys: ${entry.keys.join(', ')}`)
    console.log(`  Enabled: ${entry.enabled}`)
    console.log(`  Content: ${entry.content.slice(0, 50)}...`)
  }
}
```

Lorebooks can also be standalone files (not embedded in a card):

```typescript
import { readLorebook } from '@motioneffector/cards'

const lorebook = readLorebook(fileBytes)
```

## Decorators

V3 introduced decorators - inline metadata that controls entry behavior. They appear at the start of entry content, prefixed with `@@`:

```
@@depth 4
@@role system
@@activate_only_after 3
The Crystal Tower is an ancient spire...
```

When you read a card, decorators are parsed into a structured `decorators` array, and the content field contains only the actual text (without decorator lines).

```typescript
const entry = card.data.character_book.entries[0]

// Decorators are parsed
console.log(entry.decorators)
// [
//   { type: 'depth', value: 4 },
//   { type: 'role', value: 'system' },
//   { type: 'activate_only_after', value: 3 }
// ]

// Content is clean
console.log(entry.content)
// "The Crystal Tower is an ancient spire..."
```

### Decorator Types

**Activation control:**
- `@@activate` - Always activate (ignore keys)
- `@@dont_activate` - Never activate
- `@@activate_only_after N` - Only after N messages
- `@@activate_only_every N` - Every Nth activation
- `@@keep_activate_after_match` - Stay active once triggered
- `@@dont_activate_after_match` - Deactivate after first trigger

**Position control:**
- `@@depth N` - Insert at depth N in context
- `@@position VALUE` - Specific position (before_char, after_char, etc.)
- `@@role VALUE` - Message role (system, user, assistant)

**Scanning control:**
- `@@scan_depth N` - How far back to scan for keys
- `@@additional_keys KEY1,KEY2` - Extra trigger keys
- `@@exclude_keys KEY1,KEY2` - Keys that prevent activation

## Key Points

- **Embedded vs standalone** - Lorebooks can be embedded in cards (`character_book`) or stored as separate files. Both use the same structure.

- **Decorator parsing is automatic** - By default, `readCard()` parses decorators. Disable with `{ parseDecorators: false }` if you want raw content.

- **Unknown decorators are preserved** - If an entry contains `@@some_future_decorator`, it's stored as `{ type: 'unknown', name: 'some_future_decorator', value: '...' }`. This ensures forward compatibility.

- **Order matters** - The `insertion_order` field determines priority when multiple entries activate. Lower numbers insert first.

## Examples

### Creating a Lorebook Entry

```typescript
import type { LorebookEntry } from '@motioneffector/cards'

const entry: LorebookEntry = {
  keys: ['Crystal Tower', 'the tower', 'Valdris'],
  content: 'The Crystal Tower is an ancient spire built by Archmage Valdris.',
  enabled: true,
  insertion_order: 100,
  use_regex: false,
  extensions: {},
  // Optional fields
  name: 'Crystal Tower Lore',
  priority: 10,
  case_sensitive: false,
}
```

### Adding Decorators Programmatically

```typescript
import type { Decorator } from '@motioneffector/cards'

const entry = card.data.character_book.entries[0]

// Add decorators
entry.decorators = [
  { type: 'depth', value: 4 },
  { type: 'role', value: 'system' },
]

// When you write the card, decorators serialize back to @@syntax
```

### Manual Decorator Parsing

```typescript
import { parseDecorators, serializeDecorators } from '@motioneffector/cards'

// Parse decorator lines from content
const raw = '@@depth 4\n@@role system\nActual content here'
const { decorators, content } = parseDecorators(raw)
// decorators: [{ type: 'depth', value: 4 }, { type: 'role', value: 'system' }]
// content: 'Actual content here'

// Serialize back
const serialized = serializeDecorators(decorators, content)
// '@@depth 4\n@@role system\nActual content here'
```

## Related

- **[Character Cards](Concept-Character-Cards)** - The parent structure that contains lorebooks
- **[Working with Decorators](Guide-Working-With-Decorators)** - Practical guide to manipulating decorators
- **[Decorator API](API-Decorator)** - Reference for parseDecorators and serializeDecorators
