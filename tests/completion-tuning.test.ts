import { describe, expect, it } from 'vitest'
import {
  COMPLETION_REQUEST_MIN_INTERVAL_MS,
  computeCompletionStartDelayMs,
} from '../src/ai/completionTuning'

describe('completion request cadence', () => {
  it('keeps the configured debounce for the first network request', () => {
    expect(
      computeCompletionStartDelayMs({
        configuredDelayMs: 300,
        lastRequestStartedAtMs: 0,
        retryAtMs: 0,
        nowMs: 10_000,
      }),
    ).toBe(300)
  })

  it('spaces real provider requests even when a slow typist pauses between characters', () => {
    expect(
      computeCompletionStartDelayMs({
        configuredDelayMs: 300,
        lastRequestStartedAtMs: 9_700,
        retryAtMs: 0,
        nowMs: 10_000,
      }),
    ).toBe(COMPLETION_REQUEST_MIN_INTERVAL_MS - 300)
  })

  it('lets provider backoff dominate both debounce and cadence', () => {
    expect(
      computeCompletionStartDelayMs({
        configuredDelayMs: 150,
        lastRequestStartedAtMs: 9_800,
        retryAtMs: 12_500,
        nowMs: 10_000,
      }),
    ).toBe(2_500)
  })
})
