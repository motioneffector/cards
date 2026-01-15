/**
 * @motioneffector/cards Demo - Demo Logic
 * Event listeners and exhibit initialization
 */

import {
  readChunks,
  parseDecorators,
  ELENA_V3
} from './library.js'

import {
  getCurrentChunks,
  setCurrentChunks,
  setAnimationSpeed,
  setRepairSpeed,
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

  // Initialize exhibits with EMPTY outputs (no auto-play)
  // Inputs are populated with example data, but no computation runs
  updateOutputPreview()  // Only updates preview, doesn't run library functions
  initDecoratorExhibit()  // Only initializes UI, doesn't parse
})
