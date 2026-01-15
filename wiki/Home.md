# @motioneffector/cards

Character cards are portable AI character definitions - everything an application needs to roleplay as a specific persona. This library is the Swiss Army knife for reading and writing them. It understands all versions (V1, V2, V3) and formats (PNG, JSON, CHARX), normalizes everything to V3 internally, and writes back with full compatibility for older applications.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Character Card](Your-First-Character-Card) |
| Read a character card file | [Reading Cards](Guide-Reading-Cards) |
| Understand the card data structure | [Character Cards](Concept-Character-Cards) |
| Work with lorebooks and decorators | [Lorebooks & Decorators](Concept-Lorebooks-And-Decorators) |
| Validate or repair cards | [Validation & Repair](Guide-Validation-And-Repair) |
| Write cards with V2 compatibility | [Format Compatibility](Guide-Format-Compatibility) |
| Look up a specific function | [Reading API](API-Reading) |

## Key Concepts

### Character Cards

The primary data structure containing a character's definition - name, personality, scenario, first message, and optional extras like lorebooks and assets. Cards come in three spec versions (V1/V2/V3), but the library normalizes everything to V3 so you never deal with version differences.

### Lorebooks

Knowledge databases embedded in cards or stored standalone. Each entry contains trigger keys and content that gets injected into conversations when keywords match. V3 adds decorators for fine-grained control over activation and positioning.

### File Formats

Cards live in three container formats: PNG (embedded invisibly in image metadata), JSON (raw text), and CHARX (ZIP bundles with assets). The `readCard()` function auto-detects format, so you don't need to know which one you're dealing with.

## Quick Example

```typescript
import { readCard, writeCardToPng } from '@motioneffector/cards'

// Read a card from any format (PNG, JSON, or CHARX)
const card = readCard(fileBytes)

// Access the normalized V3 data
console.log(card.data.name)
console.log(card.data.description)
console.log(card.data.personality)

// Modify and write back to PNG
card.data.character_version = '1.1.0'
const newPng = writeCardToPng(card, originalImageBytes)
```

---

**[Full API Reference →](API-Reading)**
