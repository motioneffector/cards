# Character Cards

A character card is a structured definition of an AI persona. It contains everything an application needs to roleplay as a specific character: their name, personality, background scenario, opening message, and optional extras like knowledge databases (lorebooks) and visual assets.

## How It Works

Think of a character card as a portable character profile. When you share a card, you're sharing all the prompts and context needed to make an AI behave like that character. The card format is standardized, so cards created in one application work in others.

The library normalizes all cards to V3 format internally. When you call `readCard()`, you always get back a V3 structure - even if the source file was a V1 or V2 card. This means you write code for one format and it handles all versions automatically.

```
V1 Card (legacy) ─┐
V2 Card (common) ─┼─→ readCard() ─→ V3 CharacterCard
V3 Card (latest) ─┘
```

## Basic Usage

```typescript
import { readCard } from '@motioneffector/cards'

const card = readCard(fileBytes)

// Core character fields
console.log(card.data.name)           // Character's name
console.log(card.data.description)    // Who they are
console.log(card.data.personality)    // How they behave
console.log(card.data.scenario)       // The situation/context
console.log(card.data.first_mes)      // Opening message
console.log(card.data.mes_example)    // Example dialogue format

// Metadata
console.log(card.data.creator)        // Who made the card
console.log(card.data.tags)           // Categorization tags
console.log(card.data.character_version)  // Version string
```

The `card.spec` is always `'chara_card_v3'` and `card.spec_version` is `'3.0'`.

## Key Points

- **Version normalization** - V1/V2 cards are automatically upgraded to V3 structure. Missing fields get sensible defaults (empty strings, empty arrays).

- **The `extensions` field** - Apps can store custom data in `card.data.extensions`. The library preserves these even if it doesn't understand them. Never delete extensions you didn't create.

- **Optional vs required fields** - Core V1 fields (name, description, etc.) are always present. V3 additions like `nickname`, `assets`, and `character_book` are optional.

## Examples

### Creating a New Card

```typescript
import type { CharacterCard } from '@motioneffector/cards'

const card: CharacterCard = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: 'Elena',
    description: 'A traveling merchant who deals in rare magical artifacts.',
    personality: 'Shrewd but fair. Values honesty in business dealings.',
    scenario: 'The user encounters Elena at a crossroads market.',
    first_mes: '*Elena looks up from arranging her wares* Ah, a customer! Looking for something specific, or just browsing?',
    mes_example: '<START>\n{{user}}: What do you have for sale?\n{{char}}: *gestures at the display* Mostly protective charms today.',
    creator_notes: 'Works best with fantasy settings.',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: [],
    tags: ['fantasy', 'merchant', 'original'],
    creator: 'your-username',
    character_version: '1.0.0',
    extensions: {},
    group_only_greetings: [],
  },
}
```

### Checking for Optional Data

```typescript
const card = readCard(fileBytes)

// Character book (lorebook) is optional
if (card.data.character_book) {
  console.log(`Lorebook has ${card.data.character_book.entries.length} entries`)
}

// Assets are optional
if (card.data.assets && card.data.assets.length > 0) {
  console.log('Card includes assets:')
  for (const asset of card.data.assets) {
    console.log(`  ${asset.type}: ${asset.name}`)
  }
}

// Nickname is optional
const displayName = card.data.nickname ?? card.data.name
```

## Related

- **[Lorebooks & Decorators](Concept-Lorebooks-And-Decorators)** - The knowledge database system embedded in cards
- **[File Formats](Concept-File-Formats)** - How cards are stored in PNG, JSON, and CHARX files
- **[Types & Interfaces](API-Types-And-Interfaces)** - Full type definitions for CharacterCard
