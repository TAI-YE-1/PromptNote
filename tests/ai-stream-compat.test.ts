import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiProvider } from '../src/ai/provider'
import type { AiSettings } from '../src/ai/types'
import { fetchAiTransport } from './testAiTransport'

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
    const current = settings('fast-a')
    await expect(
      getAiProvider(current, fetchAiTransport).streamCompletion(
        current,
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
    const current = settings('mislabeled-json')
    await expect(
      getAiProvider(current, fetchAiTransport).streamCompletion(
        current,
        { action: 'complete', content: '现有较长文本' },
        (text) => partials.push(text),
      ),
    ).resolves.toBe('普通 JSON 补全')
    expect(partials).toEqual(['普通 JSON 补全'])
  })

  it('classifies response body stream interruptions as transient provider errors', async () => {
    const brokenBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new TypeError('BodyStreamBuffer was aborted'))
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(brokenBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )

    const current = settings('broken-stream')
    const error = await getAiProvider(current, fetchAiTransport)
      .streamCompletion(current, { action: 'complete', content: '较长上下文' }, () => {})
      .catch((caught: unknown) => caught)

    expect(error).toMatchObject({ name: 'AiRequestError', transient: true, status: null })
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('AI 响应读取中断')
    expect((error as Error).message).toContain('BodyStreamBuffer was aborted')
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
    await getAiProvider(modelA, fetchAiTransport).streamCompletion(modelA, { action: 'complete', content: 'A' }, () => {})
    await expect(
      getAiProvider(modelB, fetchAiTransport).streamCompletion(modelB, { action: 'complete', content: 'B' }, () => {}),
    ).resolves.toBe('B stream')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const thirdBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as { stream?: boolean; model?: string }
    expect(thirdBody.stream).toBe(true)
    expect(thirdBody.model).toBe('model-b')
  })
})
