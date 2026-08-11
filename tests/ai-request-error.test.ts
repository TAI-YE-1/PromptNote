import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiRequestError, getAiProvider } from '../src/ai/provider'
import type { AiSettings } from '../src/ai/types'
import { fetchAiTransport } from './testAiTransport'

const settings: AiSettings = {
  enabled: true,
  configured: true,
  completionEnabled: true,
  completionContextChars: 320,
  completionDelayMs: 300,
  completionModel: '',
  instructionOverrides: {},
  provider: 'openai-compatible',
  model: 'test-model',
  baseUrl: 'https://example.com/v1',
  apiKey: 'test-key',
  scope: 'selection',
}

afterEach(() => vi.unstubAllGlobals())

describe('AiRequestError classification', () => {
  it('treats short-lived 429 concurrency pressure as transient and honors Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response("We're receiving too many requests at the moment.", {
          status: 429,
          headers: { 'Retry-After': '2' },
        }),
      ),
    )

    try {
      await getAiProvider(settings, fetchAiTransport).generate(settings, { action: 'complete', content: '继续' })
      throw new Error('expected provider request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AiRequestError)
      expect(error).toMatchObject({ status: 429, transient: true, retryAfterMs: 2_000 })
    }
  })

  it('does not endlessly retry a 429 quota exhaustion error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response("You've reached your usage limit for this period.", { status: 429 }),
      ),
    )

    try {
      await getAiProvider(settings, fetchAiTransport).generate(settings, { action: 'complete', content: '继续' })
      throw new Error('expected provider request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AiRequestError)
      expect(error).toMatchObject({ status: 429, transient: false })
    }
  })

  it('recognizes localized quota exhaustion text as persistent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: '本周期额度已用尽' } }), { status: 429 })),
    )

    try {
      await getAiProvider(settings, fetchAiTransport).generate(settings, { action: 'complete', content: '继续' })
      throw new Error('expected provider request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AiRequestError)
      expect(error).toMatchObject({ status: 429, transient: false, message: '本周期额度已用尽' })
    }
  })

  it('extracts a readable message from JSON provider error bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: 'model temporarily unavailable', code: 'busy' } }), {
          status: 503,
        }),
      ),
    )

    await expect(
      getAiProvider(settings, fetchAiTransport).generate(settings, { action: 'complete', content: '继续' }),
    ).rejects.toMatchObject({
      name: 'AiRequestError',
      status: 503,
      transient: true,
      message: 'model temporarily unavailable',
    })
  })

  it('treats upstream 5xx failures as transient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('upstream unavailable', { status: 503 })))

    try {
      await getAiProvider(settings, fetchAiTransport).generate(settings, { action: 'complete', content: '继续' })
      throw new Error('expected provider request to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(AiRequestError)
      expect(error).toMatchObject({ status: 503, transient: true })
    }
  })
})
