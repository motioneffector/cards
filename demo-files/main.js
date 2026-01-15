/**
 * @motioneffector/cards Demo - Main Entry Point
 * Event listeners, showcase mode, and initialization
 */

import {
  readChunks,
  parseDecorators,
  ELENA_V3
} from './library.js'

import {
  getCurrentChunks,
  setCurrentChunks,
  animationSpeed,
  repairSpeed,
  setAnimationSpeed,
  setRepairSpeed,
  LOREBOOK_ENTRIES,
  displayChunks,
  selectChunk,
  loadSample,
  updateState,
  updateOutputPreview,
  buildAndDownload,
  initDecoratorExhibit,
  loadLorebookEntry,
  parseDecoratorContent,
  serializeDecoratorContent,
  addDecorator,
  runRepair
} from './exhibits.js'

import { testRunner } from './tests.js'

// ============================================
// FULL SHOWCASE - DEMO ALL EXHIBITS
// ============================================

async function runFullShowcase() {
  // Set speeds for visible but fast animations
  const savedSpeed = animationSpeed
  const savedRepairSpeed = repairSpeed
  setAnimationSpeed(92)
  setRepairSpeed(85)

  const scrollToExhibit = (id) => {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Get current chunks from module
  let chunks = getCurrentChunks()

  // === EXHIBIT 1: PNG Anatomy Theater ===
  scrollToExhibit('exhibit-1')
  document.getElementById('parse-state').textContent = 'Showcase: Loading V1 sample...'
  await new Promise(r => setTimeout(r, 300))

  // Load V1
  chunks = await loadSample('v1')
  await new Promise(r => setTimeout(r, 600))

  // Load V2
  document.getElementById('parse-state').textContent = 'Showcase: Loading V2 sample...'
  chunks = await loadSample('v2')
  await new Promise(r => setTimeout(r, 600))

  // Load V3
  document.getElementById('parse-state').textContent = 'Showcase: Loading V3 sample...'
  chunks = await loadSample('v3')
  await new Promise(r => setTimeout(r, 600))

  // Click through different chunks
  if (chunks && chunks.length > 1) {
    for (let i = 0; i < Math.min(chunks.length, 4); i++) {
      await selectChunk(i)
      await new Promise(r => setTimeout(r, 300))
    }
  }

  // === EXHIBIT 2: Format Forge ===
  scrollToExhibit('exhibit-2')
  await new Promise(r => setTimeout(r, 400))

  document.getElementById('forge-state').textContent = 'Showcase: Editing card fields...'

  // Modify a field
  const nameInput = document.getElementById('forge-name')
  nameInput.value = 'Elena the Wanderer'
  updateOutputPreview()
  await new Promise(r => setTimeout(r, 400))

  // Toggle V2 chunk off and on
  document.getElementById('include-v2').checked = false
  updateOutputPreview()
  document.getElementById('forge-state').textContent = 'Showcase: V2 chunk disabled'
  await new Promise(r => setTimeout(r, 400))

  document.getElementById('include-v2').checked = true
  updateOutputPreview()
  document.getElementById('forge-state').textContent = 'Showcase: V2 chunk enabled'
  await new Promise(r => setTimeout(r, 400))

  // Switch formats
  document.getElementById('output-format').value = 'json'
  updateOutputPreview()
  document.getElementById('forge-state').textContent = 'Showcase: JSON format'
  await new Promise(r => setTimeout(r, 400))

  document.getElementById('output-format').value = 'charx'
  updateOutputPreview()
  document.getElementById('forge-state').textContent = 'Showcase: CHARX format'
  await new Promise(r => setTimeout(r, 400))

  document.getElementById('output-format').value = 'png'
  updateOutputPreview()
  document.getElementById('forge-state').textContent = 'Showcase: PNG format (default)'
  await new Promise(r => setTimeout(r, 300))

  // Reset name
  nameInput.value = 'Elena'
  updateOutputPreview()

  // === EXHIBIT 3: Decorator Transformer ===
  scrollToExhibit('exhibit-3')
  await new Promise(r => setTimeout(r, 400))

  document.getElementById('decorator-state').textContent = 'Showcase: Parsing decorators...'

  // Parse decorators
  await parseDecoratorContent()
  await new Promise(r => setTimeout(r, 500))

  // Add a decorator
  document.getElementById('decorator-state').textContent = 'Showcase: Adding decorator...'
  addDecorator('scan_depth')
  await new Promise(r => setTimeout(r, 400))

  // Serialize back
  document.getElementById('decorator-state').textContent = 'Showcase: Serializing...'
  await serializeDecoratorContent()
  await new Promise(r => setTimeout(r, 400))

  // Load different lorebook entries
  for (let i = 1; i < Math.min(LOREBOOK_ENTRIES.length, 3); i++) {
    loadLorebookEntry(i)
    await new Promise(r => setTimeout(r, 300))
    await parseDecoratorContent()
    await new Promise(r => setTimeout(r, 300))
  }

  // === EXHIBIT 4: Repair Laboratory ===
  scrollToExhibit('exhibit-4')
  await new Promise(r => setTimeout(r, 400))

  // Run different repair scenarios
  document.getElementById('repair-state').textContent = 'Showcase: Testing bad CRC...'
  await runRepair('bad-crc')
  await new Promise(r => setTimeout(r, 500))

  document.getElementById('repair-state').textContent = 'Showcase: Testing truncated base64...'
  await runRepair('truncated')
  await new Promise(r => setTimeout(r, 500))

  document.getElementById('repair-state').textContent = 'Showcase: Testing healthy card...'
  await runRepair('healthy')
  await new Promise(r => setTimeout(r, 500))

  // === SCROLL TO TEST RUNNER AND RUN TESTS ===
  document.querySelector('.test-runner').scrollIntoView({ behavior: 'smooth', block: 'start' })
  await new Promise(r => setTimeout(r, 400))

  // Restore speeds
  setAnimationSpeed(savedSpeed)
  setRepairSpeed(savedRepairSpeed)

  // Now run the actual tests
  await testRunner.run()
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Exhibit 1 controls
  document.getElementById('replay-parse').addEventListener('click', async () => {
    const chunks = getCurrentChunks()
    if (chunks.length > 0) {
      await displayChunks(chunks)
      const textIndex = chunks.findIndex(c => c.type === 'tEXt')
      if (textIndex >= 0) await selectChunk(textIndex)
    }
  })

  document.getElementById('load-v1').addEventListener('click', () => loadSample('v1'))
  document.getElementById('load-v2').addEventListener('click', () => loadSample('v2'))
  document.getElementById('load-v3').addEventListener('click', () => loadSample('v3'))

  document.getElementById('parse-speed').addEventListener('input', (e) => {
    const speed = parseInt(e.target.value)
    setAnimationSpeed(speed)
    const label = speed < 30 ? 'Slow' : speed < 70 ? 'Normal' : 'Fast'
    document.getElementById('speed-text').textContent = label
  })

  // Exhibit 2 controls
  const forgeInputs = ['forge-name', 'forge-desc', 'forge-personality', 'forge-first-mes', 'forge-tags']
  forgeInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateOutputPreview)
  })

  document.getElementById('output-format').addEventListener('change', updateOutputPreview)
  document.getElementById('include-v2').addEventListener('change', updateOutputPreview)
  document.getElementById('serialize-decorators').addEventListener('change', updateOutputPreview)
  document.getElementById('build-download').addEventListener('click', buildAndDownload)
  document.getElementById('reset-forge').addEventListener('click', () => {
    document.getElementById('forge-name').value = 'Elena'
    document.getElementById('forge-desc').value = ELENA_V3.data.description
    document.getElementById('forge-personality').value = ELENA_V3.data.personality
    document.getElementById('forge-first-mes').value = ELENA_V3.data.first_mes
    document.getElementById('forge-tags').value = ELENA_V3.data.tags.join(', ')
    updateOutputPreview()
  })

  // Exhibit 3 controls
  document.getElementById('parse-decorators').addEventListener('click', parseDecoratorContent)
  document.getElementById('serialize-btn').addEventListener('click', serializeDecoratorContent)
  document.getElementById('raw-decorators').addEventListener('input', () => {
    document.getElementById('decorator-state').textContent = 'Out of sync - Click Parse to update'
  })

  document.querySelectorAll('[data-decorator]').forEach(btn => {
    btn.addEventListener('click', () => addDecorator(btn.dataset.decorator))
  })

  // Exhibit 4 controls
  document.getElementById('replay-repair').addEventListener('click', () => runRepair('bad-crc'))
  document.getElementById('load-bad-crc').addEventListener('click', () => runRepair('bad-crc'))
  document.getElementById('load-truncated').addEventListener('click', () => runRepair('truncated'))
  document.getElementById('load-malformed').addEventListener('click', () => runRepair('malformed'))
  document.getElementById('load-healthy').addEventListener('click', () => runRepair('healthy'))

  document.getElementById('repair-speed').addEventListener('input', (e) => {
    setRepairSpeed(parseInt(e.target.value))
  })

  // Test runner with full showcase
  document.getElementById('run-tests').addEventListener('click', () => runFullShowcase())
  document.getElementById('reset-page').addEventListener('click', () => location.reload())

  // Drop zones
  const setupDropZone = (id, handler) => {
    const zone = document.getElementById(id)
    zone.addEventListener('dragover', (e) => {
      e.preventDefault()
      zone.classList.add('dragover')
    })
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover')
    })
    zone.addEventListener('drop', async (e) => {
      e.preventDefault()
      zone.classList.remove('dragover')
      const file = e.dataTransfer.files[0]
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        handler(bytes, file.name)
      }
    })
  }

  setupDropZone('drop-zone-1', async (bytes, filename) => {
    try {
      const chunks = readChunks(bytes)
      setCurrentChunks(chunks)
      await displayChunks(chunks)
      const textIndex = chunks.findIndex(c => c.type === 'tEXt')
      if (textIndex >= 0) await selectChunk(textIndex)
      updateState(`Loaded: ${filename} (${chunks.length} chunks)`)
    } catch (e) {
      updateState(`Error: ${e.message}`)
    }
  })

  setupDropZone('drop-zone-4', async (bytes, filename) => {
    document.getElementById('repair-state').textContent = `Loaded: ${filename} - Click Replay to test`
  })

  // Initialize exhibits
  loadSample('v2') // Pre-load V2 sample
  updateOutputPreview()
  initDecoratorExhibit()
  runRepair('bad-crc') // Pre-run repair demo
})
