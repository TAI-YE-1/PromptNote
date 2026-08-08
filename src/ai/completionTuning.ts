export const COMPLETION_CONTEXT_DEFAULT = 320
export const COMPLETION_DELAY_DEFAULT_MS = 300

export const COMPLETION_CONTEXT_MIN = 16
export const COMPLETION_CONTEXT_MAX = 2_000
export const COMPLETION_DELAY_MIN_MS = 50
export const COMPLETION_DELAY_MAX_MS = 3_000

// Debounce controls how long the caret must stay idle before the first request.
// This separate floor controls how frequently real network requests may start while
// a user is composing a longer sentence with natural pauses between keystrokes.
export const COMPLETION_REQUEST_MIN_INTERVAL_MS = 1_200

export const COMPLETION_CONTEXT_PRESETS = [160, 320, 640] as const
export const COMPLETION_DELAY_PRESETS = [150, 300, 600] as const

export function isValidCompletionContextChars(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= COMPLETION_CONTEXT_MIN && Number(value) <= COMPLETION_CONTEXT_MAX
}

export function isValidCompletionDelayMs(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= COMPLETION_DELAY_MIN_MS && Number(value) <= COMPLETION_DELAY_MAX_MS
}

export function normalizeCompletionContextChars(value: unknown): number {
  return isValidCompletionContextChars(value) ? value : COMPLETION_CONTEXT_DEFAULT
}

export function normalizeCompletionDelayMs(value: unknown): number {
  return isValidCompletionDelayMs(value) ? value : COMPLETION_DELAY_DEFAULT_MS
}

export function computeCompletionStartDelayMs(options: {
  configuredDelayMs: number
  lastRequestStartedAtMs: number
  retryAtMs: number
  nowMs: number
}): number {
  const sinceLastRequest = options.lastRequestStartedAtMs > 0
    ? options.nowMs - options.lastRequestStartedAtMs
    : Number.POSITIVE_INFINITY
  const cadenceWait = Number.isFinite(sinceLastRequest)
    ? Math.max(0, COMPLETION_REQUEST_MIN_INTERVAL_MS - sinceLastRequest)
    : 0
  const retryWait = Math.max(0, options.retryAtMs - options.nowMs)
  return Math.max(options.configuredDelayMs, cadenceWait, retryWait)
}
