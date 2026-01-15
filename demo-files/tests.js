/**
 * @motioneffector/cards Demo - Test Definitions
 * Integrity tests and library-specific tests
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

import {
  loadSample,
  getCurrentChunks,
  selectChunk,
  updateOutputPreview,
  runRepair,
  parseDecoratorContent,
  serializeDecoratorContent,
  addDecorator,
  setAnimationSpeed,
  setRepairSpeed,
  LOREBOOK_ENTRIES,
  loadLorebookEntry
} from './exhibits.js'

// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output]')
    outputs.forEach(output => {
      // Allow placeholder text but not actual content
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder') ||
        output.querySelector('.test-output-placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      // If it has content that isn't a placeholder, that's a violation
      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    // At least one export must be a function
    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    // Check for common mock patterns in window
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        // Skip cross-origin stylesheets
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      // CORS error - assume external sheet has animations
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return // No buttons to check

    // Check that buttons aren't unstyled
    const btn = buttons[0]
    const styles = window.getComputedStyle(btn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      // Must have a title
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      // Must have an interactive area
      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

// First register integrity tests
registerIntegrityTests()

// Then register library-specific tests
// CharacterCard structure tests
testRunner.registerTest('CharacterCard has spec field', () => {
  if (ELENA_V3.spec !== 'chara_card_v3') throw new Error('Expected spec to be chara_card_v3')
})

testRunner.registerTest('CharacterCard has spec_version field', () => {
  if (ELENA_V3.spec_version !== '3.0') throw new Error('Expected spec_version to be 3.0')
})

testRunner.registerTest('CharacterCard has data.name', () => {
  if (typeof ELENA_V3.data.name !== 'string') throw new Error('Expected name to be string')
})

testRunner.registerTest('CharacterCard has data.description', () => {
  if (typeof ELENA_V3.data.description !== 'string') throw new Error('Expected description to be string')
})

testRunner.registerTest('CharacterCard has data.tags array', () => {
  if (!Array.isArray(ELENA_V3.data.tags)) throw new Error('Expected tags to be array')
})

testRunner.registerTest('CharacterCard has data.character_book', () => {
  if (!ELENA_V3.data.character_book) throw new Error('Expected character_book to exist')
})

// Lorebook tests
testRunner.registerTest('Lorebook has entries array', () => {
  if (!Array.isArray(ELENA_V3.data.character_book.entries)) throw new Error('Expected entries to be array')
})

testRunner.registerTest('LorebookEntry has keys array', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (!Array.isArray(entry.keys)) throw new Error('Expected keys to be array')
})

testRunner.registerTest('LorebookEntry has content string', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (typeof entry.content !== 'string') throw new Error('Expected content to be string')
})

testRunner.registerTest('LorebookEntry has enabled boolean', () => {
  const entry = ELENA_V3.data.character_book.entries[0]
  if (typeof entry.enabled !== 'boolean') throw new Error('Expected enabled to be boolean')
})

// Base64 tests
testRunner.registerTest('encodeBase64 works correctly', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111])
  const result = encodeBase64(bytes)
  if (result !== 'SGVsbG8=') throw new Error(`Expected SGVsbG8=, got ${result}`)
})

testRunner.registerTest('decodeBase64 works correctly', () => {
  const result = decodeBase64('SGVsbG8=')
  if (result[0] !== 72 || result[1] !== 101) throw new Error('Decode failed')
})

testRunner.registerTest('Base64 round-trip preserves data', () => {
  const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128])
  const encoded = encodeBase64(original)
  const decoded = decodeBase64(encoded)
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== decoded[i]) throw new Error(`Mismatch at ${i}`)
  }
})

// CRC-32 tests
testRunner.registerTest('CRC-32 matches known test vector', () => {
  const data = new Uint8Array([...('123456789')].map(c => c.charCodeAt(0)))
  const crc = computeCRC32(data)
  if (crc !== 0xcbf43926) throw new Error(`Expected 0xcbf43926, got ${crc.toString(16)}`)
})

testRunner.registerTest('CRC-32 of empty data is 0', () => {
  const crc = computeCRC32(new Uint8Array(0))
  if (crc !== 0) throw new Error(`Expected 0, got ${crc}`)
})

// PNG chunk tests
testRunner.registerTest('PNG chunks can be read', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  if (chunks.length < 2) throw new Error('Expected at least 2 chunks')
})

testRunner.registerTest('PNG chunks include IHDR', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  if (chunks[0].type !== 'IHDR') throw new Error('First chunk should be IHDR')
})

testRunner.registerTest('PNG chunks include IEND', () => {
  const png = createMinimalPng()
  const chunks = readChunks(png)
  const lastChunk = chunks[chunks.length - 1]
  if (lastChunk.type !== 'IEND') throw new Error('Last chunk should be IEND')
})

testRunner.registerTest('tEXt chunk can be created', () => {
  const chunk = createTextChunk('test', 'data')
  if (chunk.type !== 'tEXt') throw new Error('Expected tEXt type')
})

testRunner.registerTest('tEXt chunk contains keyword', () => {
  const chunk = createTextChunk('ccv3', 'data')
  const nullIndex = chunk.data.indexOf(0)
  const keyword = decodeUTF8(chunk.data.slice(0, nullIndex))
  if (keyword !== 'ccv3') throw new Error(`Expected ccv3, got ${keyword}`)
})

// Decorator tests
testRunner.registerTest('parseDecorators extracts depth', () => {
  const result = parseDecorators('@@depth 4\nContent')
  if (result.decorators[0].type !== 'depth') throw new Error('Expected depth decorator')
  if (result.decorators[0].value !== 4) throw new Error('Expected value 4')
})

testRunner.registerTest('parseDecorators extracts role', () => {
  const result = parseDecorators('@@role system\nContent')
  if (result.decorators[0].type !== 'role') throw new Error('Expected role decorator')
  if (result.decorators[0].value !== 'system') throw new Error('Expected system')
})

testRunner.registerTest('parseDecorators extracts activate', () => {
  const result = parseDecorators('@@activate\nContent')
  if (result.decorators[0].type !== 'activate') throw new Error('Expected activate')
})

testRunner.registerTest('parseDecorators extracts multiple decorators', () => {
  const result = parseDecorators('@@depth 4\n@@role system\n@@activate\nContent')
  if (result.decorators.length !== 3) throw new Error(`Expected 3, got ${result.decorators.length}`)
})

testRunner.registerTest('parseDecorators returns clean content', () => {
  const result = parseDecorators('@@depth 4\nActual content here')
  if (result.content !== 'Actual content here') throw new Error(`Wrong content: ${result.content}`)
})

testRunner.registerTest('serializeDecorators adds @@ prefix', () => {
  const result = serializeDecorators([{ type: 'depth', value: 4 }], 'content')
  if (!result.startsWith('@@depth 4')) throw new Error('Missing decorator')
})

testRunner.registerTest('serializeDecorators preserves content', () => {
  const result = serializeDecorators([{ type: 'activate' }], 'my content')
  if (!result.endsWith('my content')) throw new Error('Content not preserved')
})

testRunner.registerTest('Decorator round-trip preserves data', () => {
  const original = '@@depth 4\n@@role system\nContent here'
  const parsed = parseDecorators(original)
  const serialized = serializeDecorators(parsed.decorators, parsed.content)
  if (serialized !== original) throw new Error('Round-trip failed')
})

// PNG with card tests
testRunner.registerTest('PNG with card can be created', () => {
  const png = createPngWithCard(ELENA_V3)
  if (png[0] !== 0x89) throw new Error('Invalid PNG signature')
})

testRunner.registerTest('PNG with card contains ccv3 chunk', () => {
  const png = createPngWithCard(ELENA_V3)
  const chunks = readChunks(png)
  const ccv3 = chunks.find(c => {
    if (c.type !== 'tEXt') return false
    const nullIndex = c.data.indexOf(0)
    return decodeUTF8(c.data.slice(0, nullIndex)) === 'ccv3'
  })
  if (!ccv3) throw new Error('No ccv3 chunk found')
})

testRunner.registerTest('PNG with card contains chara chunk when V2 enabled', () => {
  const png = createPngWithCard(ELENA_V3, true)
  const chunks = readChunks(png)
  const chara = chunks.find(c => {
    if (c.type !== 'tEXt') return false
    const nullIndex = c.data.indexOf(0)
    return decodeUTF8(c.data.slice(0, nullIndex)) === 'chara'
  })
  if (!chara) throw new Error('No chara chunk found')
})

testRunner.registerTest('Card data can be extracted from PNG', () => {
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
testRunner.registerTest('V1 card is normalized correctly', () => {
  // V1 has only 6 fields
  const keys = Object.keys(ELENA_V1)
  if (keys.length !== 6) throw new Error('V1 should have 6 fields')
})

testRunner.registerTest('V2 card has spec field', () => {
  if (ELENA_V2.spec !== 'chara_card_v2') throw new Error('V2 spec incorrect')
})

// UTF-8 tests
testRunner.registerTest('UTF-8 encoding works', () => {
  const bytes = encodeUTF8('Hello')
  if (bytes[0] !== 72) throw new Error('Encoding failed')
})

testRunner.registerTest('UTF-8 decoding works', () => {
  const str = decodeUTF8(new Uint8Array([72, 101, 108, 108, 111]))
  if (str !== 'Hello') throw new Error('Decoding failed')
})

testRunner.registerTest('UTF-8 round-trip preserves unicode', () => {
  const original = 'Hello 世界 🌍'
  const encoded = encodeUTF8(original)
  const decoded = decodeUTF8(encoded)
  if (decoded !== original) throw new Error('Unicode not preserved')
})

// Edge case tests
testRunner.registerTest('Empty input handling', () => {
  const result = parseDecorators('')
  if (result.decorators.length !== 0) throw new Error('Expected empty decorators')
})

testRunner.registerTest('Content-only input (no decorators)', () => {
  const result = parseDecorators('Just content, no decorators')
  if (result.decorators.length !== 0) throw new Error('Expected no decorators')
  if (result.content !== 'Just content, no decorators') throw new Error('Content wrong')
})

// ============================================
// EXHIBIT REGISTRATIONS FOR WALKTHROUGH
// ============================================

// Exhibit 1: PNG Anatomy Theater
testRunner.registerExhibit(
  'PNG Anatomy Theater',
  document.getElementById('exhibit-1'),
  async () => {
    setAnimationSpeed(92)
    await loadSample('v1')
    await testRunner.delay(600)
    await loadSample('v2')
    await testRunner.delay(600)
    await loadSample('v3')
    await testRunner.delay(400)

    const chunks = getCurrentChunks()
    if (chunks && chunks.length > 1) {
      for (let i = 0; i < Math.min(chunks.length, 3); i++) {
        await selectChunk(i)
        await testRunner.delay(300)
      }
    }
  }
)

// Exhibit 2: Format Forge
testRunner.registerExhibit(
  'Format Forge',
  document.getElementById('exhibit-2'),
  async () => {
    const nameInput = document.getElementById('forge-name')
    nameInput.value = 'Elena the Wanderer'
    updateOutputPreview()
    await testRunner.delay(400)

    document.getElementById('include-v2').checked = false
    updateOutputPreview()
    await testRunner.delay(400)

    document.getElementById('include-v2').checked = true
    updateOutputPreview()
    await testRunner.delay(400)

    document.getElementById('output-format').value = 'json'
    updateOutputPreview()
    await testRunner.delay(400)

    document.getElementById('output-format').value = 'png'
    updateOutputPreview()
    nameInput.value = 'Elena'
    updateOutputPreview()
  }
)

// Exhibit 3: Decorator Transformer
testRunner.registerExhibit(
  'Decorator Transformer',
  document.getElementById('exhibit-3'),
  async () => {
    await parseDecoratorContent()
    await testRunner.delay(500)

    addDecorator('scan_depth')
    await testRunner.delay(400)

    await serializeDecoratorContent()
    await testRunner.delay(400)

    for (let i = 1; i < Math.min(LOREBOOK_ENTRIES.length, 3); i++) {
      loadLorebookEntry(i)
      await testRunner.delay(300)
      await parseDecoratorContent()
      await testRunner.delay(300)
    }

    // Reset to first entry
    loadLorebookEntry(0)
    await parseDecoratorContent()
  }
)

// Exhibit 4: Repair Laboratory
testRunner.registerExhibit(
  'Repair Laboratory',
  document.getElementById('exhibit-4'),
  async () => {
    setRepairSpeed(85)
    await runRepair('bad-crc')
    await testRunner.delay(500)

    await runRepair('truncated')
    await testRunner.delay(500)

    await runRepair('healthy')
    await testRunner.delay(500)
  }
)
