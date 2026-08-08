import { buildSystemInstruction } from './instructions'
import type { AiProvider, AiRequest, AiSettings } from './types'

export const AI_REQUEST_TIMEOUT_MS = 30_000

const nonStreamingEndpoints = new Set<string>()

function trimBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function apiEndpoint(baseUrl: string, path: `/v1/${string}`): string {
  const base = trimBaseUrl(baseUrl)
  return base.endsWith('/v1') ? `${base}${path.slice(3)}` : `${base}${path}`
}

function modelForRequest(settings: AiSettings, request: AiRequest): string {
  if (request.action === 'complete' && settings.completionModel.trim()) {
    return settings.completionModel.trim()
  }
  return settings.model
}

function userPayload(request: AiRequest): string {
  if (!request.surroundingContext) return request.content
  return `选中内容：\n${request.content}\n\n相邻上下文：\n${request.surroundingContext}`
}

async function fetchAi(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  try {
    return await fetch(url, { ...init, signal: requestSignal })
  } catch (error) {
    if (signal?.aborted) throw error
    if (error && typeof error === 'object' && 'name' in error) {
      const name = String((error as { name?: unknown }).name)
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new Error(`AI 请求超过 ${AI_REQUEST_TIMEOUT_MS / 1000} 秒，已停止等待。`)
      }
    }
    throw new Error('无法连接 AI Provider。请检查 API Base URL、网络连接与站点访问授权。', {
      cause: error,
    })
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) throw new Error(text || `AI 请求失败：HTTP ${response.status}`)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('AI 返回了无法解析的 JSON。')
  }
}

async function readSuccessfulJson(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('AI 返回了无法解析的 JSON。')
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function extractOpenAIContent(value: unknown): string {
  const root = asRecord(value)
  const choices = root?.choices
  if (!Array.isArray(choices) || !choices[0]) throw new Error('OpenAI-compatible 返回缺少 choices。')
  const choice = asRecord(choices[0])
  const message = asRecord(choice?.message)
  const content = message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('OpenAI-compatible 返回空内容。')
  return content.trimEnd()
}

function extractAnthropicContent(value: unknown): string {
  const root = asRecord(value)
  const content = root?.content
  if (!Array.isArray(content)) throw new Error('Anthropic 返回缺少 content。')
  const pieces = content
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text as string)
  const text = pieces.join('\n').trimEnd()
  if (!text.trim()) throw new Error('Anthropic 返回空内容。')
  return text
}

function completionBody(settings: AiSettings, request: AiRequest, stream: boolean) {
  return JSON.stringify({
    model: modelForRequest(settings, request),
    temperature: 0.1,
    stream,
    messages: [
      { role: 'system', content: buildSystemInstruction(settings, request.action) },
      { role: 'user', content: userPayload(request) },
    ],
  })
}

function anthropicBody(settings: AiSettings, request: AiRequest, stream: boolean) {
  return JSON.stringify({
    model: modelForRequest(settings, request),
    max_tokens: request.action === 'complete' ? 120 : 800,
    temperature: request.action === 'complete' ? 0.1 : 0.2,
    stream,
    system: buildSystemInstruction(settings, request.action),
    messages: [{ role: 'user', content: userPayload(request) }],
  })
}

function isEventStream(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').toLowerCase().includes('text/event-stream')
}

function isUnsupportedStreaming(status: number, text: string): boolean {
  return [400, 404, 405, 415, 422].includes(status) && /stream|streaming|sse/i.test(text)
}

async function readSse(response: Response, onData: (data: string) => void): Promise<void> {
  if (!response.body) throw new Error('AI 流式响应缺少可读取的 body。')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const consumeEvent = (event: string) => {
    for (const rawLine of event.split('\n')) {
      const line = rawLine.replace(/\r$/, '')
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trimStart()
      if (data) onData(data)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      consumeEvent(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) consumeEvent(buffer)
}

async function fallbackCompletion(
  provider: AiProvider,
  settings: AiSettings,
  request: AiRequest,
  onPartial: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const text = await provider.generate(settings, request, signal)
  onPartial(text)
  return text
}

class OpenAICompatibleProvider implements AiProvider {
  async testConnection(settings: AiSettings): Promise<void> {
    await this.generate(settings, { action: 'shorten', content: '测试连接。' })
  }

  async generate(settings: AiSettings, request: AiRequest, signal?: AbortSignal): Promise<string> {
    const response = await fetchAi(
      apiEndpoint(settings.baseUrl, '/v1/chat/completions'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelForRequest(settings, request),
          temperature: request.action === 'complete' ? 0.1 : 0.2,
          messages: [
            { role: 'system', content: buildSystemInstruction(settings, request.action) },
            { role: 'user', content: userPayload(request) },
          ],
        }),
      },
      signal,
    )
    return extractOpenAIContent(await readJson(response))
  }

  async streamCompletion(
    settings: AiSettings,
    request: AiRequest,
    onPartial: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const endpoint = apiEndpoint(settings.baseUrl, '/v1/chat/completions')
    const streamKey = `openai-compatible:${endpoint}`
    if (nonStreamingEndpoints.has(streamKey)) {
      return fallbackCompletion(this, settings, request, onPartial, signal)
    }

    const response = await fetchAi(
      endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: completionBody(settings, request, true),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      if (isUnsupportedStreaming(response.status, text)) {
        nonStreamingEndpoints.add(streamKey)
        return fallbackCompletion(this, settings, request, onPartial, signal)
      }
      throw new Error(text || `AI 请求失败：HTTP ${response.status}`)
    }

    if (!isEventStream(response)) {
      nonStreamingEndpoints.add(streamKey)
      const text = extractOpenAIContent(await readSuccessfulJson(response))
      onPartial(text)
      return text
    }

    let accumulated = ''
    await readSse(response, (data) => {
      if (data === '[DONE]') return
      let root: Record<string, unknown> | null = null
      try {
        root = asRecord(JSON.parse(data) as unknown)
      } catch {
        return
      }
      const choices = root?.choices
      if (!Array.isArray(choices) || !choices[0]) return
      const choice = asRecord(choices[0])
      const delta = asRecord(choice?.delta)
      const content = delta?.content
      if (typeof content !== 'string' || !content) return
      accumulated += content
      onPartial(accumulated)
    })

    if (!accumulated.trim()) throw new Error('OpenAI-compatible 流式补全返回空内容。')
    return accumulated.trimEnd()
  }
}

class AnthropicProvider implements AiProvider {
  async testConnection(settings: AiSettings): Promise<void> {
    await this.generate(settings, { action: 'shorten', content: '测试连接。' })
  }

  async generate(settings: AiSettings, request: AiRequest, signal?: AbortSignal): Promise<string> {
    const response = await fetchAi(
      apiEndpoint(settings.baseUrl, '/v1/messages'),
      {
        method: 'POST',
        headers: {
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: anthropicBody(settings, request, false),
      },
      signal,
    )
    return extractAnthropicContent(await readJson(response))
  }

  async streamCompletion(
    settings: AiSettings,
    request: AiRequest,
    onPartial: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const endpoint = apiEndpoint(settings.baseUrl, '/v1/messages')
    const streamKey = `anthropic:${endpoint}`
    if (nonStreamingEndpoints.has(streamKey)) {
      return fallbackCompletion(this, settings, request, onPartial, signal)
    }

    const response = await fetchAi(
      endpoint,
      {
        method: 'POST',
        headers: {
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: anthropicBody(settings, request, true),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      if (isUnsupportedStreaming(response.status, text)) {
        nonStreamingEndpoints.add(streamKey)
        return fallbackCompletion(this, settings, request, onPartial, signal)
      }
      throw new Error(text || `AI 请求失败：HTTP ${response.status}`)
    }

    if (!isEventStream(response)) {
      nonStreamingEndpoints.add(streamKey)
      const text = extractAnthropicContent(await readSuccessfulJson(response))
      onPartial(text)
      return text
    }

    let accumulated = ''
    await readSse(response, (data) => {
      let root: Record<string, unknown> | null = null
      try {
        root = asRecord(JSON.parse(data) as unknown)
      } catch {
        return
      }

      if (root?.type === 'content_block_start') {
        const block = asRecord(root.content_block)
        if (block?.type === 'text' && typeof block.text === 'string' && block.text) {
          accumulated += block.text
          onPartial(accumulated)
        }
        return
      }

      if (root?.type !== 'content_block_delta') return
      const delta = asRecord(root.delta)
      if (delta?.type !== 'text_delta' || typeof delta.text !== 'string' || !delta.text) return
      accumulated += delta.text
      onPartial(accumulated)
    })

    if (!accumulated.trim()) throw new Error('Anthropic 流式补全返回空内容。')
    return accumulated.trimEnd()
  }
}

export function getAiProvider(settings: AiSettings): AiProvider {
  if (settings.provider === 'anthropic') return new AnthropicProvider()
  return new OpenAICompatibleProvider()
}

export function defaultBaseUrl(provider: AiSettings['provider']): string {
  return provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com'
}

export async function ensureAiHostPermission(baseUrl: string): Promise<boolean> {
  const url = new URL(baseUrl)
  const originPattern = `${url.origin}/*`
  if (await chrome.permissions.contains({ origins: [originPattern] })) return true
  return chrome.permissions.request({ origins: [originPattern] })
}
