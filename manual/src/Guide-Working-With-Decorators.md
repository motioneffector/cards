# Working with Decorators

Parse, modify, and serialize V3 lorebook decorators. Decorators are metadata prefixed with `@@` that control how and when lorebook entries activate.

## Prerequisites

Before starting, you should:

- [Understand lorebooks](Concept-Lorebooks-And-Decorators)
- Know how to [read](Guide-Reading-Cards) and [write](Guide-Writing-And-Exporting) cards

## Overview

We'll cover:

1. Accessing parsed decorators
2. Adding and removing decorators
3. Manual parsing and serialization
4. Common decorator patterns

## Step 1: Access Parsed Decorators

When you read a card, decorators are automatically parsed from entry content:

```typescript
import { readCard } from '@motioneffector/cards'

const card = readCard(fileBytes)
const entries = card.data.character_book?.entries ?? []

for (const entry of entries) {
  console.log(`Entry: ${entry.name ?? entry.keys[0]}`)

  // Decorators are parsed into an array
  if (entry.decorators && entry.decorators.length > 0) {
    for (const decorator of entry.decorators) {
      console.log(`  @@ ${decorator.type}`, 'value' in decorator ? decorator.value : '')
    }
  }

  // Content is clean (no @@ lines)
  console.log(`  Content: ${entry.content.slice(0, 50)}...`)
}
```

## Step 2: Add and Remove Decorators

Modify the `decorators` array directly:

```typescript
import type { Decorator } from '@motioneffector/cards'

const entry = card.data.character_book!.entries[0]

// Initialize if needed
entry.decorators = entry.decorators ?? []

// Add decorators
entry.decorators.push({ type: 'depth', value: 4 })
entry.decorators.push({ type: 'role', value: 'system' })

// Remove a specific decorator
entry.decorators = entry.decorators.filter(d => d.type !== 'depth')

// Clear all decorators
entry.decorators = []
```

When you write the card, decorators are serialized back to `@@` syntax automatically.

## Step 3: Manual Parsing and Serialization

For working with raw decorator strings outside of cards:

```typescript
import { parseDecorators, serializeDecorators } from '@motioneffector/cards'

// Parse decorator lines from content
const rawContent = `@@depth 4
@@role system
@@activate_only_after 3
This is the actual entry content.
It can have multiple lines.`

const { decorators, content } = parseDecorators(rawContent)

console.log(decorators)
// [
//   { type: 'depth', value: 4 },
//   { type: 'role', value: 'system' },
//   { type: 'activate_only_after', value: 3 }
// ]

console.log(content)
// "This is the actual entry content.\nIt can have multiple lines."

// Serialize back to string
const serialized = serializeDecorators(decorators, content)
// "@@depth 4\n@@role system\n@@activate_only_after 3\nThis is the actual entry content.\n..."
```

## Step 4: Common Decorator Patterns

### Control Insertion Depth

Place entries at specific depths in the context:

```typescript
// Insert at depth 4 (4 messages from the end)
entry.decorators = [{ type: 'depth', value: 4 }]

// Insert in reverse order (from start of conversation)
entry.decorators = [{ type: 'reverse_depth', value: 0 }]
```

### Set Message Role

Make entries appear as system messages or user messages:

```typescript
// Inject as system message
entry.decorators = [
  { type: 'depth', value: 0 },
  { type: 'role', value: 'system' }
]

// Inject as user message
entry.decorators = [{ type: 'role', value: 'user' }]
```

### Conditional Activation

Control when entries activate:

```typescript
// Only activate after 3 messages in the conversation
entry.decorators = [{ type: 'activate_only_after', value: 3 }]

// Activate every 5th trigger (cooldown)
entry.decorators = [{ type: 'activate_only_every', value: 5 }]

// Stay active once triggered (don't deactivate)
entry.decorators = [{ type: 'keep_activate_after_match' }]

// Forced activation (ignore keys)
entry.decorators = [{ type: 'activate' }]

// Forced deactivation (always skip)
entry.decorators = [{ type: 'dont_activate' }]
```

### Additional Matching Control

Modify how entries are matched:

```typescript
// Add extra trigger keys
entry.decorators = [{ type: 'additional_keys', value: ['extra', 'keywords'] }]

// Exclude certain keys from triggering
entry.decorators = [{ type: 'exclude_keys', value: ['spoiler', 'secret'] }]

// Custom scan depth for this entry
entry.decorators = [{ type: 'scan_depth', value: 20 }]
```

## Complete Example

```typescript
import { readCard, writeCardToPng } from '@motioneffector/cards'
import type { Decorator } from '@motioneffector/cards'
import { readFileSync, writeFileSync } from 'fs'

// Load card
const bytes = readFileSync('character.png')
const card = readCard(bytes)

// Find or create lorebook
if (!card.data.character_book) {
  card.data.character_book = { entries: [], extensions: {} }
}

// Add a new entry with decorators
card.data.character_book.entries.push({
  keys: ['secret base', 'hideout', 'lair'],
  content: 'The secret base is hidden beneath the old lighthouse on the cliff.',
  enabled: true,
  insertion_order: 100,
  use_regex: false,
  extensions: {},
  name: 'Secret Base Location',
  decorators: [
    { type: 'depth', value: 2 },
    { type: 'role', value: 'system' },
    { type: 'activate_only_after', value: 5 }  // Only reveal after conversation develops
  ]
})

// Modify existing entry decorators
for (const entry of card.data.character_book.entries) {
  // Add depth to entries without positioning
  const hasPosition = entry.decorators?.some(d =>
    d.type === 'depth' || d.type === 'position' || d.type === 'reverse_depth'
  )

  if (!hasPosition) {
    entry.decorators = entry.decorators ?? []
    entry.decorators.push({ type: 'depth', value: 4 })
  }
}

// Save
const output = writeCardToPng(card, bytes)
writeFileSync('character-updated.png', output)
```

## Variations

### Preserving Unknown Decorators

Future or app-specific decorators are preserved:

```typescript
const { decorators } = parseDecorators('@@future_decorator some_value\nContent')

// Unknown decorators stored with type 'unknown'
console.log(decorators[0])
// { type: 'unknown', name: 'future_decorator', value: 'some_value' }

// They serialize back correctly
const serialized = serializeDecorators(decorators, 'Content')
// "@@future_decorator some_value\nContent"
```

### Bulk Decorator Updates

Apply decorators to all entries:

```typescript
const entries = card.data.character_book?.entries ?? []

for (const entry of entries) {
  entry.decorators = entry.decorators ?? []

  // Ensure all entries have a role
  if (!entry.decorators.some(d => d.type === 'role')) {
    entry.decorators.push({ type: 'role', value: 'system' })
  }
}
```

### Reading Without Decorator Parsing

Keep `@@` lines in content:

```typescript
const card = readCard(bytes, { parseDecorators: false })

// entry.content includes @@lines
// entry.decorators is undefined
```

## Troubleshooting

### Decorators not appearing after write

**Symptom:** You added decorators but the written file doesn't have `@@` lines.

**Cause:** You may have set `serializeDecorators: false` in write options.

**Solution:** Use default options or explicitly set `{ serializeDecorators: true }`.

### Decorators duplicated after round-trip

**Symptom:** Reading and writing a card doubles the decorators.

**Cause:** You're reading with `parseDecorators: false` (so decorators stay in content) but writing with `serializeDecorators: true` (which adds them again from the array).

**Solution:** Use consistent settings. Either parse and serialize (defaults), or skip both.

### Unknown decorator type in array

**Symptom:** A decorator has `type: 'unknown'`.

**Cause:** The decorator name isn't in the V3 spec. It may be from a future version or app-specific.

**Solution:** This is normal - unknown decorators are preserved for forward compatibility. They'll serialize back correctly.

## See Also

- **[Lorebooks & Decorators](Concept-Lorebooks-And-Decorators)** - Conceptual overview
- **[Decorator API](API-Decorator)** - Function reference
- **[Types & Interfaces](API-Types-And-Interfaces)** - Decorator type definitions
