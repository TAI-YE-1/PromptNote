import {
  setOrbIdle,
  showDockedPanel,
  snapOrb,
  startOrbDrag,
} from './platform/desktop/shell'
import './orb.css'

const orb = document.getElementById('promptnote-orb')
if (!(orb instanceof HTMLButtonElement)) {
  throw new Error('PromptNote orb button missing.')
}

const DRAG_THRESHOLD_PX = 5
const IDLE_DELAY_MS = 1600

let pointerId: number | null = null
let startX = 0
let startY = 0
let dragging = false
let idleTimer: number | null = null

function clearIdleTimer() {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }
}

function scheduleIdle() {
  clearIdleTimer()
  idleTimer = window.setTimeout(() => {
    idleTimer = null
    void setOrbIdle(true).catch(reportShellError)
  }, IDLE_DELAY_MS)
}

function reveal() {
  clearIdleTimer()
  void setOrbIdle(false).catch(reportShellError)
}

orb.addEventListener('pointerenter', reveal)
orb.addEventListener('pointerleave', () => {
  if (!dragging) scheduleIdle()
})

orb.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return
  reveal()
  pointerId = event.pointerId
  startX = event.screenX
  startY = event.screenY
  dragging = false
  orb.setPointerCapture(event.pointerId)
})

orb.addEventListener('pointermove', (event) => {
  if (pointerId !== event.pointerId || dragging) return
  const distance = Math.hypot(event.screenX - startX, event.screenY - startY)
  if (distance < DRAG_THRESHOLD_PX) return

  dragging = true
  orb.classList.add('is-dragging')
  void startOrbDrag().catch((error) => {
    dragging = false
    orb.classList.remove('is-dragging')
    reportShellError(error)
  })
})

orb.addEventListener('pointerup', (event) => {
  if (pointerId !== event.pointerId) return
  const wasDragging = dragging
  pointerId = null
  dragging = false
  orb.classList.remove('is-dragging')
  if (orb.hasPointerCapture(event.pointerId)) orb.releasePointerCapture(event.pointerId)

  if (wasDragging) {
    void snapOrb().then(scheduleIdle).catch(reportShellError)
  } else {
    void showDockedPanel().catch(reportShellError)
  }
})

orb.addEventListener('pointercancel', (event) => {
  if (pointerId !== event.pointerId) return
  pointerId = null
  dragging = false
  orb.classList.remove('is-dragging')
  if (orb.hasPointerCapture(event.pointerId)) orb.releasePointerCapture(event.pointerId)
  void snapOrb().then(scheduleIdle).catch(reportShellError)
})

orb.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

scheduleIdle()

function reportShellError(error: unknown) {
  console.error('PromptNote orb shell action failed:', error)
}
