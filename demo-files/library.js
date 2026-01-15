/**
 * @motioneffector/cards Demo - Library Utilities
 * Core functions for encoding, PNG handling, and decorator parsing
 */

// ============================================
// CONSTANTS
// ============================================

export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// ============================================
// CRC-32
// ============================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c >>> 0
  }
  return table
})()

export function computeCRC32(data, data2 = null) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  if (data2) {
    for (let i = 0; i < data2.length; i++) {
      crc = CRC_TABLE[(crc ^ data2[i]) & 0xff] ^ (crc >>> 8)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ============================================
// BASE64
// ============================================

export function encodeBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  const len = bytes.length
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i]
    const b = i + 1 < len ? bytes[i + 1] : 0
    const c = i + 2 < len ? bytes[i + 2] : 0
    result += chars[a >> 2]
    result += chars[((a & 3) << 4) | (b >> 4)]
    result += i + 1 < len ? chars[((b & 15) << 2) | (c >> 6)] : '='
    result += i + 2 < len ? chars[c & 63] : '='
  }
  return result
}

export function decodeBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const lookup = new Map([...chars].map((c, i) => [c, i]))
  str = str.replace(/[^A-Za-z0-9+/]/g, '')
  const len = str.length
  const bytes = new Uint8Array(Math.floor(len * 3 / 4))
  let j = 0
  for (let i = 0; i < len; i += 4) {
    const a = lookup.get(str[i]) || 0
    const b = lookup.get(str[i + 1]) || 0
    const c = lookup.get(str[i + 2]) || 0
    const d = lookup.get(str[i + 3]) || 0
    bytes[j++] = (a << 2) | (b >> 4)
    if (str[i + 2] !== '=') bytes[j++] = ((b & 15) << 4) | (c >> 2)
    if (str[i + 3] !== '=') bytes[j++] = ((c & 3) << 6) | d
  }
  return bytes.slice(0, j)
}

// ============================================
// UTF-8
// ============================================

export function encodeUTF8(str) {
  return new TextEncoder().encode(str)
}

export function decodeUTF8(bytes) {
  return new TextDecoder().decode(bytes)
}

// ============================================
// PNG CHUNK HANDLING
// ============================================

export function readChunks(bytes) {
  const chunks = []
  let offset = 8 // Skip PNG signature
  while (offset < bytes.length) {
    const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                   (bytes[offset + 2] << 8) | bytes[offset + 3]
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5],
                                      bytes[offset + 6], bytes[offset + 7])
    const data = bytes.slice(offset + 8, offset + 8 + length)
    const crc = (bytes[offset + 8 + length] << 24) | (bytes[offset + 8 + length + 1] << 16) |
                (bytes[offset + 8 + length + 2] << 8) | bytes[offset + 8 + length + 3]
    chunks.push({ length, type, data, crc })
    offset += 12 + length
    if (type === 'IEND') break
  }
  return chunks
}

export function writeChunks(chunks) {
  let totalSize = 8 // PNG signature
  for (const chunk of chunks) {
    totalSize += 12 + chunk.data.length
  }
  const result = new Uint8Array(totalSize)
  result.set(PNG_SIGNATURE, 0)
  let offset = 8
  for (const chunk of chunks) {
    const len = chunk.data.length
    result[offset] = (len >> 24) & 0xff
    result[offset + 1] = (len >> 16) & 0xff
    result[offset + 2] = (len >> 8) & 0xff
    result[offset + 3] = len & 0xff
    const typeBytes = encodeUTF8(chunk.type)
    result.set(typeBytes, offset + 4)
    result.set(chunk.data, offset + 8)
    const crc = computeCRC32(typeBytes, chunk.data)
    result[offset + 8 + len] = (crc >> 24) & 0xff
    result[offset + 8 + len + 1] = (crc >> 16) & 0xff
    result[offset + 8 + len + 2] = (crc >> 8) & 0xff
    result[offset + 8 + len + 3] = crc & 0xff
    offset += 12 + len
  }
  return result
}

export function createTextChunk(keyword, text) {
  const keywordBytes = encodeUTF8(keyword)
  const textBytes = encodeUTF8(text)
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length)
  data.set(keywordBytes, 0)
  data[keywordBytes.length] = 0
  data.set(textBytes, keywordBytes.length + 1)
  const typeBytes = encodeUTF8('tEXt')
  return {
    length: data.length,
    type: 'tEXt',
    data,
    crc: computeCRC32(typeBytes, data)
  }
}

// ============================================
// DECORATOR PARSING
// ============================================

export function parseDecorators(content) {
  const lines = content.split('\n')
  const decorators = []
  let contentStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('@@')) {
      contentStart = i
      break
    }
    contentStart = i + 1

    const match = line.match(/^@@(\w+)(?:\s+(.+))?$/)
    if (!match) continue

    const [, name, value] = match

    switch (name) {
      case 'depth':
      case 'instruct_depth':
      case 'reverse_depth':
      case 'scan_depth':
      case 'instruct_scan_depth':
      case 'is_greeting':
      case 'activate_only_after':
      case 'activate_only_every':
        decorators.push({ type: name, value: parseInt(value, 10) })
        break
      case 'role':
        decorators.push({ type: 'role', value: value })
        break
      case 'position':
        decorators.push({ type: 'position', value: value })
        break
      case 'additional_keys':
      case 'exclude_keys':
        decorators.push({ type: name, value: value.split(',').map(s => s.trim()) })
        break
      case 'activate':
      case 'dont_activate':
      case 'keep_activate_after_match':
      case 'dont_activate_after_match':
      case 'ignore_on_max_context':
        decorators.push({ type: name })
        break
      case 'is_user_icon':
      case 'disable_ui_prompt':
        decorators.push({ type: name, value: value })
        break
      default:
        decorators.push({ type: 'unknown', name, value })
    }
  }

  return {
    decorators,
    content: lines.slice(contentStart).join('\n')
  }
}

export function serializeDecorators(decorators, content) {
  const lines = []
  for (const dec of decorators) {
    if (dec.type === 'unknown') {
      lines.push(`@@${dec.name}${dec.value ? ' ' + dec.value : ''}`)
    } else if ('value' in dec) {
      const val = Array.isArray(dec.value) ? dec.value.join(',') : dec.value
      lines.push(`@@${dec.type} ${val}`)
    } else {
      lines.push(`@@${dec.type}`)
    }
  }
  lines.push(content)
  return lines.join('\n')
}

// ============================================
// SAMPLE DATA - ELENA THE MERCHANT
// ============================================

export const ELENA_V3 = {
  spec: 'chara_card_v3',
  spec_version: '3.0',
  data: {
    name: 'Elena',
    description: 'A traveling merchant who deals in rare magical artifacts. She runs a modest cart between villages.',
    personality: 'Shrewd but fair. Values honesty in business dealings. Has a dry wit.',
    scenario: 'The user encounters Elena at a crossroads market on a misty morning.',
    first_mes: '*Elena looks up from arranging her wares, a knowing smile crossing her weathered face.* Ah, a customer with discerning taste, I hope. Looking for something specific, or shall I surprise you?',
    mes_example: '<START>\n{{user}}: What do you sell?\n{{char}}: *gestures broadly at her cart* Everything and nothing, depending on what you need. Amulets, scrolls, curious trinkets from distant lands. The question is - what calls to you?',
    creator_notes: 'Elena works best in fantasy settings. She has hidden depths - former adventurer turned merchant.',
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: [
      '*Without looking up from her ledger* The good stuff is in the back. The cheap stuff is what you see. Which are you?',
      '*Elena is closing up her cart as you approach* Ah, just in time. Or just too late, depending on your perspective.'
    ],
    tags: ['fantasy', 'merchant', 'original', 'friendly'],
    creator: 'Demo',
    character_version: '1.0',
    extensions: {},
    group_only_greetings: [],
    character_book: {
      name: 'Elena\'s World',
      entries: [
        {
          keys: ['cart', 'wares', 'merchandise'],
          content: '@@depth 2\nElena\'s cart is deceptively spacious, enchanted to hold far more than it appears. Drawers slide out from impossible angles, revealing carefully organized inventory.',
          enabled: true,
          insertion_order: 0,
          use_regex: false,
          extensions: {}
        },
        {
          keys: ['crossroads', 'market'],
          content: 'The crossroads market appears every new moon, a tradition dating back centuries. Merchants from all corners gather here under an unspoken truce.',
          enabled: true,
          insertion_order: 1,
          use_regex: false,
          extensions: {}
        },
        {
          keys: ['past', 'adventurer', 'history'],
          content: '@@role system\n@@activate_only_after 5\nElena was once a renowned treasure hunter, known as "The Finder." She retired after a job went wrong, losing her partner. She doesn\'t speak of it.',
          enabled: true,
          insertion_order: 2,
          use_regex: false,
          extensions: {}
        },
        {
          keys: ['rival', 'Marcus', 'competition'],
          content: 'Marcus the Bold runs a competing stall. He and Elena have a complex history - former partners, now rivals, still friends when no one is watching.',
          enabled: true,
          insertion_order: 3,
          use_regex: false,
          extensions: {}
        },
        {
          keys: ['crystal', 'artifact', 'special'],
          content: '@@depth 4\n@@dont_activate_after_match\nElena keeps one artifact she never sells - a cracked crystal that glows faintly blue. It belonged to her lost partner.',
          enabled: true,
          insertion_order: 4,
          use_regex: false,
          extensions: {}
        }
      ],
      extensions: {}
    }
  }
}

export const ELENA_V2 = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: ELENA_V3.data.name,
    description: ELENA_V3.data.description,
    personality: ELENA_V3.data.personality,
    scenario: ELENA_V3.data.scenario,
    first_mes: ELENA_V3.data.first_mes,
    mes_example: ELENA_V3.data.mes_example,
    creator_notes: ELENA_V3.data.creator_notes,
    system_prompt: '',
    post_history_instructions: '',
    alternate_greetings: ELENA_V3.data.alternate_greetings,
    tags: ELENA_V3.data.tags,
    creator: ELENA_V3.data.creator,
    character_version: ELENA_V3.data.character_version,
    extensions: {},
    character_book: ELENA_V3.data.character_book
  }
}

export const ELENA_V1 = {
  name: ELENA_V3.data.name,
  description: ELENA_V3.data.description,
  personality: ELENA_V3.data.personality,
  scenario: ELENA_V3.data.scenario,
  first_mes: ELENA_V3.data.first_mes,
  mes_example: ELENA_V3.data.mes_example
}

// ============================================
// PNG CREATION HELPERS
// ============================================

export function createMinimalPng() {
  const ihdrData = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
  const ihdrChunk = {
    length: ihdrData.length,
    type: 'IHDR',
    data: ihdrData,
    crc: 0
  }
  const idatChunk = {
    length: 0,
    type: 'IDAT',
    data: new Uint8Array(0),
    crc: 0
  }
  const iendChunk = {
    length: 0,
    type: 'IEND',
    data: new Uint8Array(0),
    crc: 0
  }
  return writeChunks([ihdrChunk, idatChunk, iendChunk])
}

export function createPngWithCard(cardData, includeV2 = true) {
  const basePng = createMinimalPng()
  const chunks = readChunks(basePng)

  // Remove IEND
  const iendChunk = chunks.pop()

  // Add ccv3 chunk
  const v3Json = JSON.stringify(cardData)
  const v3Base64 = encodeBase64(encodeUTF8(v3Json))
  chunks.push(createTextChunk('ccv3', v3Base64))

  // Add chara chunk for V2 compatibility
  if (includeV2) {
    const v2Data = cardData.spec === 'chara_card_v3' ? {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: { ...cardData.data }
    } : cardData
    const v2Json = JSON.stringify(v2Data)
    const v2Base64 = encodeBase64(encodeUTF8(v2Json))
    chunks.push(createTextChunk('chara', v2Base64))
  }

  // Add back IEND
  chunks.push(iendChunk)

  return writeChunks(chunks)
}

// ============================================
// UTILITY
// ============================================

export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
