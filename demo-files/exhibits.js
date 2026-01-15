/**
 * @motioneffector/cards Demo - Exhibit Logic
 * Interactive exhibits for demonstrating library features
 */

import {
  readChunks,
  decodeBase64,
  encodeBase64,
  decodeUTF8,
  encodeUTF8,
  parseDecorators,
  serializeDecorators,
  createPngWithCard,
  escapeHtml,
  ELENA_V1,
  ELENA_V2,
  ELENA_V3
} from './library.js'

// ============================================
// SHARED STATE
// ============================================

export let currentChunks = []
export let currentCardData = null
export let animationSpeed = 70
export let repairSpeed = 50
export let currentDecorators = []
export let currentContent = ''
export let selectedEntryIndex = 0

export const LOREBOOK_ENTRIES = ELENA_V3.data.character_book.entries

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getDelay() {
  return Math.max(0, (100 - animationSpeed) * 2)
}

export function getRepairDelay() {
  return Math.max(0, (100 - repairSpeed) * 5)
}

export function setAnimationSpeed(speed) {
  animationSpeed = speed
}

export function setRepairSpeed(speed) {
  repairSpeed = speed
}

// ============================================
// EXHIBIT 1: PNG ANATOMY THEATER
// ============================================

export async function displayChunks(chunks, selectedIndex = -1) {
  const chunkList = document.getElementById('chunk-list')
  chunkList.innerHTML = ''

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const div = document.createElement('div')
    div.className = `chunk-item${i === selectedIndex ? ' selected' : ''}`

    const blockClass = chunk.type === 'IHDR' ? 'ihdr' :
                      chunk.type === 'IDAT' ? 'idat' :
                      chunk.type === 'tEXt' ? 'text' :
                      chunk.type === 'IEND' ? 'iend' : ''

    let keyword = ''
    if (chunk.type === 'tEXt') {
      const nullIndex = chunk.data.indexOf(0)
      keyword = decodeUTF8(chunk.data.slice(0, nullIndex))
    }

    div.innerHTML = `
      <div class="chunk-block ${blockClass}"></div>
      <span class="chunk-type">${chunk.type}</span>
      ${keyword ? `<span class="tag tag-green">${keyword}</span>` : ''}
      <span class="chunk-size">${chunk.data.length} bytes</span>
      <span class="chunk-crc">CRC: ${chunk.crc.toString(16).padStart(8, '0')}</span>
    `

    div.addEventListener('click', () => selectChunk(i))
    chunkList.appendChild(div)

    if (getDelay() > 0) {
      await new Promise(r => setTimeout(r, getDelay() / 2))
    }
  }
}

export async function selectChunk(index) {
  const chunks = currentChunks
  if (index < 0 || index >= chunks.length) return

  document.querySelectorAll('.chunk-item').forEach((el, i) => {
    el.classList.toggle('selected', i === index)
  })

  const chunk = chunks[index]
  const decodeStream = document.getElementById('decode-stream')
  const cardFields = document.getElementById('card-fields')

  if (chunk.type !== 'tEXt') {
    decodeStream.innerHTML = `<span class="text-muted">Select a tEXt chunk to see decoded data</span>`
    cardFields.innerHTML = ''
    return
  }

  const nullIndex = chunk.data.indexOf(0)
  const keyword = decodeUTF8(chunk.data.slice(0, nullIndex))
  const base64Text = decodeUTF8(chunk.data.slice(nullIndex + 1))

  updateState(`Decoding ${keyword} chunk...`)

  decodeStream.innerHTML = ''
  const displayChars = Math.min(base64Text.length, 200)

  for (let i = 0; i < displayChars; i++) {
    const span = document.createElement('span')
    span.className = 'decode-char'
    span.textContent = base64Text[i]
    decodeStream.appendChild(span)
  }
  if (base64Text.length > displayChars) {
    const span = document.createElement('span')
    span.className = 'text-muted'
    span.textContent = `... (${base64Text.length - displayChars} more)`
    decodeStream.appendChild(span)
  }

  const chars = decodeStream.querySelectorAll('.decode-char')
  for (let i = 0; i < chars.length; i++) {
    chars[i].classList.add('active')
    if (getDelay() > 0 && i % 10 === 0) {
      await new Promise(r => setTimeout(r, getDelay() / 10))
    }
    chars[i].classList.remove('active')
    chars[i].classList.add('decoded')
  }

  try {
    const decoded = decodeBase64(base64Text)
    const jsonStr = decodeUTF8(decoded)
    const cardData = JSON.parse(jsonStr)
    currentCardData = cardData

    await displayCardData(cardData)
    updateState(`Decoded: ${keyword} chunk (${decoded.length} bytes)`)
  } catch (e) {
    cardFields.innerHTML = `<span class="text-error">Failed to decode: ${e.message}</span>`
    updateState(`Decode error: ${e.message}`)
  }
}

export async function displayCardData(cardData) {
  const cardFields = document.getElementById('card-fields')
  const normBanner = document.getElementById('norm-banner')
  cardFields.innerHTML = ''

  let displayData = cardData
  let fieldsAdded = 0
  let version = 'V3'

  if (cardData.spec === 'chara_card_v3') {
    displayData = cardData.data
    version = 'V3'
  } else if (cardData.spec === 'chara_card_v2') {
    displayData = cardData.data
    version = 'V2'
    fieldsAdded = 2
  } else if (cardData.name && !cardData.spec) {
    displayData = cardData
    version = 'V1'
    fieldsAdded = 10
  }

  const fields = ['name', 'description', 'personality', 'scenario', 'first_mes',
                 'mes_example', 'creator_notes', 'system_prompt', 'tags', 'creator']

  for (const field of fields) {
    if (displayData[field] !== undefined) {
      const div = document.createElement('div')
      div.className = 'card-field'

      let value = displayData[field]
      if (Array.isArray(value)) value = value.join(', ')
      if (typeof value === 'string' && value.length > 50) {
        value = value.slice(0, 50) + '...'
      }

      div.innerHTML = `
        <span class="card-field-name">${field}:</span>
        <span class="card-field-value">${escapeHtml(String(value || '(empty)'))}</span>
      `
      cardFields.appendChild(div)

      if (getDelay() > 0) {
        await new Promise(r => setTimeout(r, getDelay() / 5))
      }
    }
  }

  if (fieldsAdded > 0) {
    normBanner.classList.remove('hidden')
    normBanner.textContent = `${version} → V3: +${fieldsAdded} fields added during normalization`
  } else {
    normBanner.classList.add('hidden')
  }
}

export function updateState(text) {
  document.getElementById('parse-state').textContent = text
}

export async function loadSample(version) {
  const card = version === 'v1' ? ELENA_V1 :
               version === 'v2' ? ELENA_V2 : ELENA_V3

  updateState(`Loading ${version.toUpperCase()} sample...`)

  const pngBytes = createPngWithCard(
    version === 'v1' ? { ...card } : card,
    version !== 'v1'
  )

  currentChunks = readChunks(pngBytes)
  await displayChunks(currentChunks)

  const textIndex = currentChunks.findIndex(c => c.type === 'tEXt')
  if (textIndex >= 0) {
    await selectChunk(textIndex)
  }

  updateState(`Loaded ${version.toUpperCase()} sample: ${currentChunks.length} chunks`)
  return currentChunks
}

export function getCurrentChunks() {
  return currentChunks
}

export function setCurrentChunks(chunks) {
  currentChunks = chunks
}

// ============================================
// EXHIBIT 2: FORMAT FORGE
// ============================================

export function updateOutputPreview() {
  const format = document.getElementById('output-format').value
  const includeV2 = document.getElementById('include-v2').checked
  const outputChunks = document.getElementById('output-chunks')
  const outputInfo = document.getElementById('output-info')
  const formatLabel = document.getElementById('output-format-label')

  formatLabel.textContent = format.toUpperCase()
  formatLabel.className = `tag tag-${format === 'png' ? 'blue' : format === 'json' ? 'green' : 'purple'}`

  const cardData = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: document.getElementById('forge-name').value,
      description: document.getElementById('forge-desc').value,
      personality: document.getElementById('forge-personality').value,
      scenario: '',
      first_mes: document.getElementById('forge-first-mes').value,
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: document.getElementById('forge-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      creator: 'Demo',
      character_version: '1.0',
      extensions: {},
      group_only_greetings: []
    }
  }

  const jsonStr = JSON.stringify(cardData)
  const base64 = encodeBase64(encodeUTF8(jsonStr))

  if (format === 'png') {
    outputChunks.innerHTML = `
      <div class="output-chunk">
        <div class="chunk-block ihdr"></div>
        <span>IHDR</span>
        <span class="text-muted">13 bytes</span>
      </div>
      <div class="output-chunk">
        <div class="chunk-block idat"></div>
        <span>IDAT</span>
        <span class="text-muted">(image data)</span>
      </div>
      <div class="output-chunk building">
        <div class="chunk-block text"></div>
        <span>tEXt ccv3</span>
        <span class="text-muted">${base64.length} bytes</span>
      </div>
      ${includeV2 ? `
      <div class="output-chunk building">
        <div class="chunk-block text"></div>
        <span>tEXt chara</span>
        <span class="text-muted">${base64.length} bytes</span>
      </div>
      ` : ''}
      <div class="output-chunk">
        <div class="chunk-block iend"></div>
        <span>IEND</span>
        <span class="text-muted">0 bytes</span>
      </div>
    `
    outputInfo.textContent = `Total: ~${(base64.length * (includeV2 ? 2 : 1) + 50)} bytes`
  } else if (format === 'json') {
    outputChunks.innerHTML = `
      <pre style="font-size: 11px; color: var(--text-secondary); max-height: 200px; overflow: auto;">${escapeHtml(JSON.stringify(cardData, null, 2).slice(0, 500))}...</pre>
    `
    outputInfo.textContent = `Size: ${jsonStr.length} bytes`
  } else {
    outputChunks.innerHTML = `
      <div class="output-chunk">📁 card.json</div>
      <div class="output-chunk">📁 assets/</div>
    `
    outputInfo.textContent = `CHARX ZIP archive`
  }

  document.getElementById('forge-state').textContent = 'Preview updated - Ready to build'
}

export function buildAndDownload() {
  const format = document.getElementById('output-format').value
  const includeV2 = document.getElementById('include-v2').checked

  const cardData = {
    spec: 'chara_card_v3',
    spec_version: '3.0',
    data: {
      name: document.getElementById('forge-name').value,
      description: document.getElementById('forge-desc').value,
      personality: document.getElementById('forge-personality').value,
      scenario: '',
      first_mes: document.getElementById('forge-first-mes').value,
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: document.getElementById('forge-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      creator: 'Demo',
      character_version: '1.0',
      extensions: {},
      group_only_greetings: []
    }
  }

  let blob, filename

  if (format === 'png') {
    const pngBytes = createPngWithCard(cardData, includeV2)
    blob = new Blob([pngBytes], { type: 'image/png' })
    filename = `${cardData.data.name || 'card'}.png`
  } else if (format === 'json') {
    const jsonStr = JSON.stringify(cardData, null, 2)
    blob = new Blob([jsonStr], { type: 'application/json' })
    filename = `${cardData.data.name || 'card'}.json`
  } else {
    const jsonStr = JSON.stringify(cardData, null, 2)
    blob = new Blob([jsonStr], { type: 'application/json' })
    filename = `${cardData.data.name || 'card'}.json`
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  document.getElementById('forge-state').textContent = `Downloaded: ${filename}`
}

// ============================================
// EXHIBIT 3: DECORATOR TRANSFORMER
// ============================================

export function initDecoratorExhibit() {
  // DO NOT call parseDecoratorContent() here - no auto-play!
  // Only populate the lorebook entry list

  const entriesContainer = document.getElementById('lorebook-entries')
  entriesContainer.innerHTML = '<div class="text-secondary mb-sm">Lorebook Entries (click to load)</div>'

  LOREBOOK_ENTRIES.forEach((entry, i) => {
    const div = document.createElement('div')
    div.className = `lorebook-entry-item${i === selectedEntryIndex ? ' selected' : ''}`

    const parsed = parseDecorators(entry.content)
    const decoratorCount = parsed.decorators.length

    div.innerHTML = `
      <span class="entry-name">${entry.keys[0]}</span>
      ${decoratorCount > 0 ? `<span class="entry-badge">${decoratorCount}</span>` : ''}
    `
    div.addEventListener('click', () => loadLorebookEntry(i))
    entriesContainer.appendChild(div)
  })
}

export function loadLorebookEntry(index) {
  selectedEntryIndex = index
  const entry = LOREBOOK_ENTRIES[index]

  document.getElementById('raw-decorators').value = entry.content

  document.querySelectorAll('.lorebook-entry-item').forEach((el, i) => {
    el.classList.toggle('selected', i === index)
  })

  parseDecoratorContent()
}

export async function parseDecoratorContent() {
  const raw = document.getElementById('raw-decorators').value
  const { decorators, content } = parseDecorators(raw)

  currentDecorators = decorators
  currentContent = content

  const decoratorsArea = document.getElementById('decorators-area')
  decoratorsArea.innerHTML = ''

  for (const dec of decorators) {
    const chip = document.createElement('div')
    chip.className = 'decorator-chip'

    let label = dec.type
    if ('value' in dec) {
      const val = Array.isArray(dec.value) ? dec.value.join(',') : dec.value
      label = `${dec.type}: ${val}`
    }
    chip.textContent = label

    decoratorsArea.appendChild(chip)
    await new Promise(r => setTimeout(r, 100))
  }

  document.getElementById('content-preview').textContent = content || '(no content)'
  document.getElementById('decorator-state').textContent = `Parsed: ${decorators.length} decorators found`
}

export async function serializeDecoratorContent() {
  const serialized = serializeDecorators(currentDecorators, currentContent)

  const rawArea = document.getElementById('raw-decorators')
  rawArea.style.background = 'rgba(137, 87, 229, 0.2)'
  rawArea.value = serialized

  await new Promise(r => setTimeout(r, 200))
  rawArea.style.background = ''

  document.getElementById('decorator-state').textContent = 'Serialized: Decorators written to raw text'
}

export function addDecorator(type) {
  let newDec
  switch (type) {
    case 'depth':
      newDec = { type: 'depth', value: 4 }
      break
    case 'role':
      newDec = { type: 'role', value: 'system' }
      break
    case 'position':
      newDec = { type: 'position', value: 'before_char' }
      break
    case 'activate':
      newDec = { type: 'activate' }
      break
    case 'scan_depth':
      newDec = { type: 'scan_depth', value: 10 }
      break
    default:
      return
  }

  currentDecorators.push(newDec)

  const decoratorsArea = document.getElementById('decorators-area')
  const chip = document.createElement('div')
  chip.className = 'decorator-chip'

  let label = newDec.type
  if ('value' in newDec) {
    label = `${newDec.type}: ${newDec.value}`
  }
  chip.textContent = label
  decoratorsArea.appendChild(chip)

  document.getElementById('decorator-state').textContent = `Added: ${type} decorator`
}

// ============================================
// EXHIBIT 4: REPAIR LABORATORY
// ============================================

export async function runRepair(scenario = 'bad-crc') {
  const repairLog = document.getElementById('repair-log')
  const recoveredFields = document.getElementById('recovered-fields')
  const recoverySummary = document.getElementById('recovery-summary')

  repairLog.innerHTML = ''
  recoveredFields.innerHTML = ''
  recoverySummary.innerHTML = ''

  document.getElementById('repair-state').textContent = 'Running repair...'

  const log = async (type, message) => {
    const entry = document.createElement('div')
    entry.className = `repair-entry ${type}`
    const icon = type === 'success' ? '✓' : type === 'failure' ? '✗' : type === 'warning' ? '⚠' : '►'
    entry.innerHTML = `<span class="icon">${icon}</span><span>${message}</span>`
    repairLog.appendChild(entry)
    repairLog.scrollTop = repairLog.scrollHeight
    await new Promise(r => setTimeout(r, getRepairDelay()))
  }

  const addField = async (name, status, value) => {
    const field = document.createElement('div')
    field.className = `recovered-field ${status}`
    const icon = status === 'ok' ? '✓' : status === 'partial' ? '⚠' : '✗'
    field.innerHTML = `
      <span class="status">${icon}</span>
      <span class="font-mono">${name}</span>
      <span class="text-muted">${value ? value.slice(0, 20) + (value.length > 20 ? '...' : '') : ''}</span>
    `
    recoveredFields.appendChild(field)
    await new Promise(r => setTimeout(r, getRepairDelay() / 3))
  }

  await log('info', 'Reading PNG structure...')
  await log('info', 'Found 5 chunks')
  await log('info', 'Looking for ccv3 chunk...')
  await log('info', 'Found at index 2')

  if (scenario === 'healthy') {
    await log('info', 'Checking CRC...')
    await log('success', 'CRC valid')
    await log('info', 'Decoding base64...')
    await log('success', 'Decoded 1,293 bytes')
    await log('info', 'Parsing JSON...')
    await log('success', 'Valid JSON structure')
    await log('info', 'Validating card data...')
    await log('success', 'All required fields present')

    await addField('name', 'ok', 'Elena')
    await addField('description', 'ok', 'A traveling merchant...')
    await addField('personality', 'ok', 'Shrewd but fair...')
    await addField('scenario', 'ok', 'The user encounters...')
    await addField('first_mes', 'ok', '*Elena looks up...')
    await addField('mes_example', 'ok', '<START>...')

    recoverySummary.innerHTML = `
      <div class="text-success">✓ All checks passed - No repair needed</div>
      <div class="text-muted mt-sm">12/12 fields valid</div>
    `
    document.getElementById('repair-state').textContent = 'Healthy card - No repair needed'
    return
  }

  if (scenario === 'bad-crc') {
    await log('info', 'Checking CRC...')
    await log('failure', 'CRC MISMATCH (expected 0x7a3c9f1b, got 0xff000000)')
    await log('warning', 'Ignoring CRC, attempting extraction...')
    await log('info', 'Got 1,847 bytes of data')
    await log('info', 'Decoding base64...')
    await log('success', 'Decoded 1,391 bytes')
    await log('info', 'Parsing JSON...')
    await log('success', 'Valid JSON structure')
  } else if (scenario === 'truncated') {
    await log('info', 'Checking CRC...')
    await log('success', 'CRC valid')
    await log('info', 'Decoding base64...')
    await log('failure', 'Base64 decoding failed - invalid length')
    await log('warning', 'Attempting with padding...')
    await log('success', 'Decoded 987 bytes with padding')
    await log('info', 'Parsing JSON...')
    await log('warning', 'Partial JSON structure')
  } else if (scenario === 'malformed') {
    await log('info', 'Checking CRC...')
    await log('success', 'CRC valid')
    await log('info', 'Decoding base64...')
    await log('success', 'Decoded 1,293 bytes')
    await log('info', 'Parsing JSON...')
    await log('failure', 'Unexpected token at position 892')
    await log('warning', 'Attempting partial field extraction...')
    await log('info', 'Found: name, description, personality')
    await log('info', 'Checking chara chunk...')
    await log('success', 'Valid chara chunk found - merging data')
  }

  const fields = [
    { name: 'name', ok: true, value: 'Elena' },
    { name: 'description', ok: true, value: 'A traveling merchant...' },
    { name: 'personality', ok: true, value: 'Shrewd but fair...' },
    { name: 'scenario', ok: scenario !== 'malformed', value: scenario === 'malformed' ? '' : 'The user encounters...' },
    { name: 'first_mes', ok: true, value: '*Elena looks up...' },
    { name: 'mes_example', ok: scenario === 'bad-crc', value: scenario === 'bad-crc' ? '<START>...' : '' },
    { name: 'creator_notes', ok: scenario !== 'truncated', value: scenario === 'truncated' ? '' : 'Elena works best...' },
    { name: 'tags', ok: true, value: 'fantasy, merchant...' },
    { name: 'creator', ok: true, value: 'Demo' },
    { name: 'character_book', ok: scenario === 'bad-crc', value: scenario === 'bad-crc' ? '5 entries' : '' },
  ]

  let okCount = 0
  let partialCount = 0
  let lostCount = 0

  for (const f of fields) {
    if (f.ok) {
      await addField(f.name, 'ok', f.value)
      okCount++
    } else if (f.value) {
      await addField(f.name, 'partial', f.value)
      partialCount++
    } else {
      await addField(f.name, 'lost', '(unrecoverable)')
      lostCount++
    }
  }

  const total = okCount + partialCount + lostCount
  const pct = Math.round((okCount + partialCount * 0.5) / total * 100)

  recoverySummary.innerHTML = `
    <div class="flex gap-md">
      <span class="text-success">${okCount} recovered</span>
      <span class="text-warning">${partialCount} partial</span>
      <span class="text-error">${lostCount} lost</span>
    </div>
    <div class="text-muted mt-sm">Recovery confidence: ${pct}%</div>
  `

  document.getElementById('repair-state').textContent = `Repair complete - ${okCount + partialCount}/${total} fields recovered`
}
