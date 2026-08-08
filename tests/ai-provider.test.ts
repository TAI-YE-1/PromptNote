import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiProvider } from '../src/ai/provider'
import type { AiSettings } from '../src/ai/types'

const openAiSettings: AiSettings = {
  enabled: true,
  configured: true,
  completionEnabled: true,
  completionContextChars: 320,
  completionDelayMs: 300,
  instructionOverrides: {},
  provider: 'openai-compatible',
  model: 'test-model',
  baseUrl: 'https://example.com/v1',
  apiKey: 'test-key',
  scope: 'selection',
}

const anthropicSettings: AiSettings = {
  ...openAiSettings,
  provider: 'anthropic',
  baseUrl: 'https://api.anthropic.test',
}

afterEach(() => vi.unstubAllGlobals())

describe('AI providers', () => {
  it('calls an OpenAI-compatible /v1 endpoint without duplicating /v1', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ choices: [{ message: { content: '明确后的文本' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAiProvider(openAiSettings).generate(openAiSettings, {
      action: 'clarify',
      content: '尽量改好',
    })

    expect(result).toBe('明确后的文本')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.com/v1/chat/completions')
  })

  it('keeps inline completion requests portable across OpenAI-compatible providers', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ choices: [{ message: { content: ' and keep the code clean.  ' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getAiProvider(openAiSettings).generate(openAiSettings, {
        action: 'complete',
        content: 'Only change the current issue',
      }),
    ).resolves.toBe(' and keep the code clean.')

    const init = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(body.temperature).toBe(0.1)
    expect(body).not.toHaveProperty('max_tokens')
    expect(body).not.toHaveProperty('max_completion_tokens')
  })

  it('surfaces OpenAI-compatible streamed completion as soon as partial text arrives', async () => {
    const settings = { ...openAiSettings, baseUrl: 'https://stream.example.com/v1' }
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"你"}}]}',
          '',
          'data: {"choices":[{"delta":{"content":"好"}}]}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'),
        { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const partials: string[] = []
    const result = await getAiProvider(settings).streamCompletion(
      settings,
      { action: 'complete', content: '你' },
      (text) => partials.push(text),
    )

    expect(result).toBe('你好')
    expect(partials).toEqual(['你', '你好'])
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body.stream).toBe(true)
  })

  it('falls back once when an OpenAI-compatible endpoint rejects streaming', async () => {
    const settings = { ...openAiSettings, baseUrl: 'https://no-stream.example.com/v1' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('stream parameter unsupported', { status: 400 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: '兼容补全' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const partials: string[] = []
    await expect(
      getAiProvider(settings).streamCompletion(
        settings,
        { action: 'complete', content: '继续' },
        (text) => partials.push(text),
      ),
    ).resolves.toBe('兼容补全')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(partials).toEqual(['兼容补全'])
  })

  it('uses a per-action instruction override without replacing the common guardrails', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ choices: [{ message: { content: '完成' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const settings: AiSettings = {
      ...openAiSettings,
      instructionOverrides: { complete: '只补全一个非常短的短语。' },
    }
    await getAiProvider(settings).generate(settings, { action: 'complete', content: '你是' })

    const init = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body)) as {
      messages?: Array<{ role?: string; content?: string }>
    }
    const system = body.messages?.find((message) => message.role === 'system')?.content ?? ''
    expect(system).toContain('保持用户原意')
    expect(system).toContain('只补全一个非常短的短语。')
  })

  it('extracts Anthropic text responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ content: [{ type: 'text', text: '验收标准建议' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      getAiProvider(anthropicSettings).generate(anthropicSettings, {
        action: 'draft_acceptance',
        content: '任务内容',
      }),
    ).resolves.toBe('验收标准建议')
  })

  it('streams Anthropic text deltas incrementally', async () => {
    const settings = { ...anthropicSettings, baseUrl: 'https://stream.anthropic.test' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          [
            'event: content_block_start',
            'data: {"type":"content_block_start","content_block":{"type":"text","text":""}}',
            '',
            'event: content_block_delta',
            'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"继续"}}',
            '',
            'event: content_block_delta',
            'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"写"}}',
            '',
            'event: message_stop',
            'data: {"type":"message_stop"}',
            '',
          ].join('\n'),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        ),
      ),
    )

    const partials: string[] = []
    await expect(
      getAiProvider(settings).streamCompletion(
        settings,
        { action: 'complete', content: '请' },
        (text) => partials.push(text),
      ),
    ).resolves.toBe('继续写')
    expect(partials).toEqual(['继续', '继续写'])
  })

  it('surfaces provider HTTP failures instead of returning fake success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response('invalid api key', { status: 401 }),
      ),
    )

    await expect(
      getAiProvider(openAiSettings).generate(openAiSettings, {
        action: 'shorten',
        content: '测试',
      }),
    ).rejects.toThrow(/invalid api key/)
  })

  it('turns transport failures into actionable provider guidance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Promise.reject(new TypeError('Failed to fetch')),
      ),
    )

    await expect(
      getAiProvider(openAiSettings).generate(openAiSettings, {
        action: 'shorten',
        content: '测试',
      }),
    ).rejects.toThrow(/无法连接 AI Provider.*Base URL.*网络连接.*站点访问授权/)
  })

  it('converts provider timeouts into a visible timeout error', async () => {
    const timeout = Object.assign(new Error('aborted'), { name: 'TimeoutError' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Promise.reject(timeout)),
    )

    await expect(
      getAiProvider(openAiSettings).generate(openAiSettings, {
        action: 'shorten',
        content: '测试',
      }),
    ).rejects.toThrow(/请求超过 30 秒/)
  })

  it('allows a stale completion request to be cancelled without converting it into a timeout', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          )
        }),
      ),
    )

    const request = getAiProvider(openAiSettings).generate(
      openAiSettings,
      { action: 'complete', content: '继续输入' },
      controller.signal,
    )
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
