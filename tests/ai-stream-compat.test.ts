import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiProvider } from '../src/ai/provider'
import type { AiSettings } from '../src/ai/types'

function settings(model: string): AiSettings {
  return {
    enabled: true,
    configured: true,
    completionEnabled: true,
    completionContextChars: 160,
    completionDelayMs: 150,
    completionModel: model,
    instructionOverrides: {},
    provider: 'openai-compatible',
    model: 'main-model',
    baseUrl: 'https://stream-capability.example/v1',
    apiKey: 'test-key',
    scope: 'selection',
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('OpenAI-compatible streaming compatibility', () => {
  it('accepts SSE keepalive comments before the first data event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          [
            ': keep-alive',
            '',
            'data: {"choices":[{"delta":{"content":"继续"}}]}',
            '',
            'data: [DONE]',
            '',
          ].join('\n'),
          { status: 200, headers: { 'Content-Type': 'text/plain' } },
        ),
      ),
    )

    const partials: string[] = []
    await expect(
      getAiProvider(settings('fast-a')).streamCompletion(
        settings('fast-a'),
        { action: 'complete', content: '写' },
        (text) => partials.push(text),
      ),
    ).resolves.toBe('继续')
    expect(partials).toEqual(['继续'])
  })

  it('falls back to JSON when a gateway labels a non-stream response as event-stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '普通 JSON 补全' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )

    const partials: string[] = []
    await expect(
      getAiProvider(settings('mislabeled-json')).streamCompletion(
        settings('mislabeled-json'),
        { action: 'complete', content: '现有较长文本' },
        (text) => partials.push(text),
      ),
    ).resolves.toBe('普通 JSON 补全')
    expect(partials).toEqual(['普通 JSON 补全'])
  })

  it('does not disable streaming for every model after one model rejects stream=true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('stream unsupported', { status: 400 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'A fallback' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          ['data: {"choices":[{"delta":{"content":"B stream"}}]}', '', 'data: [DONE]', ''].join('\n'),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const modelA = settings('model-a')
    const modelB = settings('model-b')
    await getAiProvider(modelA).streamCompletion(modelA, { action: 'complete', content: 'A' }, () => {})
    await expect(
      getAiProvider(modelB).streamCompletion(modelB, { action: 'complete', content: 'B' }, () => {}),
    ).resolves.toBe('B stream')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const thirdBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as { stream?: boolean; model?: string }
    expect(thirdBody.stream).toBe(true)
    expect(thirdBody.model).toBe('model-b')
  })
})
