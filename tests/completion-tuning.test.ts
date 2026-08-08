import { describe, expect, it } from 'vitest'
import {
  COMPLETION_REQUEST_MIN_INTERVAL_MS,
  COMPLETION_TRANSIENT_BACKOFF_MAX_MS,
  computeCompletionStartDelayMs,
  computeCompletionTransientRetryDelayMs,
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

describe('completion transient retry tuning', () => {
  it('backs off progressively for consecutive transient failures', () => {
    expect(computeCompletionTransientRetryDelayMs(1, null)).toBe(1_500)
    expect(computeCompletionTransientRetryDelayMs(2, null)).toBe(3_000)
    expect(computeCompletionTransientRetryDelayMs(3, null)).toBe(6_000)
  })

  it('honors a longer provider Retry-After value', () => {
    expect(computeCompletionTransientRetryDelayMs(1, 8_000)).toBe(8_000)
  })

  it('caps local exponential backoff without overriding a provider Retry-After', () => {
    expect(computeCompletionTransientRetryDelayMs(20, null)).toBe(COMPLETION_TRANSIENT_BACKOFF_MAX_MS)
    expect(computeCompletionTransientRetryDelayMs(20, 20_000)).toBe(20_000)
  })
})
