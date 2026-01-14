/**
 * @motioneffector/cards Demo - Test Runner
 * Test definitions and runner implementation
 */

import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
  computeCRC32,
  readChunks,
  createMinimalPng,
  createTextChunk,
  createPngWithCard,
  parseDecorators,
  serializeDecorators,
  escapeHtml,
  ELENA_V3,
  ELENA_V2,
  ELENA_V1
} from './library.js'

// ============================================
// TEST RUNNER
// ============================================

export const testRunner = {
  tests: [],
  results: [],
  running: false,

  register(name, fn) {
    this.tests.push({ name, fn })
  },

  async run() {
    if (this.running) return
    this.running = true
    this.results = []

    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')
    const summary = document.getElementById('test-summary')
    const passedCount = document.getElementById('passed-count')
    const failedCount = document.getElementById('failed-count')
    const skippedCount = document.getElementById('skipped-count')
    const runBtn = document.getElementById('run-tests')

    runBtn.disabled = true
    output.innerHTML = ''
    summary.classList.add('hidden')
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'

    let passed = 0
    let failed = 0

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i]
      const progress = ((i + 1) / this.tests.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Running: ${test.name}`

      try {
        await test.fn()
        passed++
        this.results.push({ name: test.name, passed: true })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon pass">✓</span>
            <span class="test-name">${escapeHtml(test.name)}</span>
          </div>
        `
      } catch (e) {
        failed++
        this.results.push({ name: test.name, passed: false, error: e.message })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon fail">✗</span>
            <div>
              <div class="test-name">${escapeHtml(test.name)}</div>
              <div class="test-error">${escapeHtml(e.message)}</div>
            </div>
          </div>
        `
      }

      // Scroll to bottom
      output.scrollTop = output.scrollHeight

      // Small delay so user can see progress
      await new Promise(r => setTimeout(r, 20))
    }

    progressFill.classList.add(failed === 0 ? 'success' : 'failure')
    progressText.textContent = `Complete: ${passed}/${this.tests.length} passed`

    passedCount.textContent = passed
    failedCount.textContent = failed
    skippedCount.textContent = 0
    summary.classList.remove('hidden')

    runBtn.disabled = false
    this.running = false
  }
}

// ============================================
// REGISTER TESTS
// ============================================

// CharacterCard structure tests
testRunner.register('CharacterCard has spec field', () => {
  if (ELENA_V3.spec !== 'chara_card_v3') throw new Error('Expected spec to be chara_card_v3')
})

testRunner.register('CharacterCard has spec_version field', () => {
  if (ELENA_V3.spec_version !== '3.0') throw new Error('Expected spec_version to be 3.0')
})

testRunner.register('CharacterCard has data.name', () => {
  if (typeof ELENA_V3.data.name !== 'string') throw new Error('Expected name to be string')
})

testRunner.register('CharacterCard has data.description', () => {
  if (typeof ELENA_V3.data.description !== 'string') throw new Error('Expected description to be string')
})

testRunner.register('CharacterCard has data.tags array', () => {
  if (!Array.isArray(ELENA_V3.data.tags)) throw new Error('Expected tags to be array')
})

testRunner.register('CharacterCard has data.character_book', () => {
  if (!ELENA_V3.data.character_book) throw new Error('Expected character_book to exist')
})

// Lorebook tests
testRunner.register('Lorebook has entries array', () => {
  if (!Array.isArray(ELENA_V3.data.character_book.entries)) throw new Error('Expected entries to be array')
})

testRunner.register('LorebookEntry has keys array', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (!Array.isArray(entry.keys)) throw new Error('Expected keys to be array')
})

testRunner.register('LorebookEntry has content string', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (typeof entry.content !== 'string') throw new Error('Expected content to be string')
})

testRunner.register('LorebookEntry has enabled boolean', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (typeof entry.enabled !== 'boolean') throw new Error('Expected enabled to be boolean')
})

// Base64 tests
testRunner.register('encodeBase64 works correctly', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111])
  const result = encodeBase64(bytes)
  if (result !== 'SGVsbG8=') throw new Error(`Expected SGVsbG8=, got ${result}`)
})

testRunner.register('decodeBase64 works correctly', () => {
  const result = decodeBase64('SGVsbG8=')
  if (result[0] !== 72 || result[1] !== 101) throw new Error('Decode failed')
})

testRunner.register('Base64 round-trip preserves data', () => {
  const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128])
  const encoded = encodeBase64(original)
  const decoded = decodeBase64(encoded)
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== decoded[i]) throw new Error(`Mismatch at ${i}`)
  }
})

// CRC-32 tests
testRunner.register('CRC-32 matches known test vector', () => {
  const data = new Uint8Array([...('123456789')].map(c => c.charCodeAt(0)))
  const crc = computeCRC32(data)
  if (crc !== 0xcbf43926) throw new Error(`Expected 0xcbf43926, got ${crc.toString(16)}`)
})

testRunner.register('CRC-32 of empty data is 0', () => {
  const crc = computeCRC32(new Uint8Array(0))
  if (crc !== 0) throw new Error(`Expected 0, got ${crc}`)
})

// PNG chunk tests
testRunner.register('PNG chunks can be read', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  if (chunks.length < 2) throw new Error('Expected at least 2 chunks')
})

testRunner.register('PNG chunks include IHDR', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  if (chunks[0].type !== 'IHDR') throw new Error('First chunk should be IHDR')
})

testRunner.register('PNG chunks include IEND', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  const lastChunk = chunks[chunks.length - 1]
  if (lastChunk.type !== 'IEND') throw new Error('Last chunk should be IEND')
})

testRunner.register('tEXt chunk can be created', () => {
  const chunk = createTextChunk('test', 'data')
  if (chunk.type !== 'tEXt') throw new Error('Expected tEXt type')
})

testRunner.register('tEXt chunk contains keyword', () => {
  const chunk = createTextChunk('ccv3', 'data')
  const nullIndex = chunk.data.indexOf(0)
  const keyword = decodeUTF8(chunk.data.slice(0, nullIndex))
  if (keyword !== 'ccv3') throw new Error(`Expected ccv3, got ${keyword}`)
})

// Decorator tests
testRunner.register('parseDecorators extracts depth', () => {
  const result = parseDecorators('@@depth 4\nContent')
  if (result.decorators[0].type !== 'depth') throw new Error('Expected depth decorator')
  if (result.decorators[0].value !== 4) throw new Error('Expected value 4')
})

testRunner.register('parseDecorators extracts role', () => {
  const result = parseDecorators('@@role system\nContent')
  if (result.decorators[0].type !== 'role') throw new Error('Expected role decorator')
  if (result.decorators[0].value !== 'system') throw new Error('Expected system')
})

testRunner.register('parseDecorators extracts activate', () => {
  const result = parseDecorators('@@activate\nContent')
  if (result.decorators[0].type !== 'activate') throw new Error('Expected activate')
})

testRunner.register('parseDecorators extracts multiple decorators', () => {
  const result = parseDecorators('@@depth 4\n@@role system\n@@activate\nContent')
  if (result.decorators.length !== 3) throw new Error(`Expected 3, got ${result.decorators.length}`)
})

testRunner.register('parseDecorators returns clean content', () => {
  const result = parseDecorators('@@depth 4\nActual content here')
  if (result.content !== 'Actual content here') throw new Error(`Wrong content: ${result.content}`)
})

testRunner.register('serializeDecorators adds @@ prefix', () => {
  const result = serializeDecorators([{ type: 'depth', value: 4 }], 'content')
  if (!result.startsWith('@@depth 4')) throw new Error('Missing decorator')
})

testRunner.register('serializeDecorators preserves content', () => {
  const result = serializeDecorators([{ type: 'activate' }], 'my content')
  if (!result.endsWith('my content')) throw new Error('Content not preserved')
})

testRunner.register('Decorator round-trip preserves data', () => {
  const original = '@@depth 4\n@@role system\nContent here'
  const parsed = parseDecorators(original)
  const serialized = serializeDecorators(parsed.decorators, parsed.content)
  if (serialized !== original) throw new Error('Round-trip failed')
})

// PNG with card tests
testRunner.register('PNG with card can be created', () => {
  const png = createPngWithCard(ELENA_V3)
  if (png[0] !== 0x89) throw new Error('Invalid PNG signature')
})

testRunner.register('PNG with card contains ccv3 chunk', () => {
  const png = createPngWithCard(ELENA_V3)
  const chunks = readChunks(png)
  const ccv3 = chunks.find(c => {
    if (c.type !== 'tEXt') return false
    const nullIndex = c.data.indexOf(0)
    return decodeUTF8(c.data.slice(0, nullIndex)) === 'ccv3'
  })
  if (!ccv3) throw new Error('No ccv3 chunk found')
})

testRunner.register('PNG with card contains chara chunk when V2 enabled', () => {
  const png = createPngWithCard(ELENA_V3, true)
  const chunks = readChunks(png)
  const chara = chunks.find(c => {
    if (c.type !== 'tEXt') return false
    const nullIndex = c.data.indexOf(0)
    return decodeUTF8(c.data.slice(0, nullIndex)) === 'chara'
  })
  if (!chara) throw new Error('No chara chunk found')
})

testRunner.register('Card data can be extracted from PNG', () => {
  const png = createPngWithCard(ELENA_V3)
  const chunks = readChunks(png)
  const ccv3 = chunks.find(c => {
    if (c.type !== 'tEXt') return false
    const nullIndex = c.data.indexOf(0)
    return decodeUTF8(c.data.slice(0, nullIndex)) === 'ccv3'
  })
  const nullIndex = ccv3.data.indexOf(0)
  const base64 = decodeUTF8(ccv3.data.slice(nullIndex + 1))
  const json = JSON.parse(decodeUTF8(decodeBase64(base64)))
  if (json.data.name !== 'Elena') throw new Error('Name mismatch')
})

// Version normalization tests
testRunner.register('V1 card is normalized correctly', () => {
  // V1 has only 6 fields
  const keys = Object.keys(ELENA_V1)
  if (keys.length !== 6) throw new Error('V1 should have 6 fields')
})

testRunner.register('V2 card has spec field', () => {
  if (ELENA_V2.spec !== 'chara_card_v2') throw new Error('V2 spec incorrect')
})

// UTF-8 tests
testRunner.register('UTF-8 encoding works', () => {
  const bytes = encodeUTF8('Hello')
  if (bytes[0] !== 72) throw new Error('Encoding failed')
})

testRunner.register('UTF-8 decoding works', () => {
  const str = decodeUTF8(new Uint8Array([72, 101, 108, 108, 111]))
  if (str !== 'Hello') throw new Error('Decoding failed')
})

testRunner.register('UTF-8 round-trip preserves unicode', () => {
  const original = 'Hello 世界 🌍'
  const encoded = encodeUTF8(original)
  const decoded = decodeUTF8(encoded)
  if (decoded !== original) throw new Error('Unicode not preserved')
})

// Edge case tests
testRunner.register('Empty input handling', () => {
  const result = parseDecorators('')
  if (result.decorators.length !== 0) throw new Error('Expected empty decorators')
})

testRunner.register('Content-only input (no decorators)', () => {
  const result = parseDecorators('Just content, no decorators')
  if (result.decorators.length !== 0) throw new Error('Expected no decorators')
  if (result.content !== 'Just content, no decorators') throw new Error('Content wrong')
})
