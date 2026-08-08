import { buildSystemInstruction } from './instructions'
import type { AiProvider, AiRequest, AiSettings } from './types'

export const AI_REQUEST_TIMEOUT_MS = 30_000

const nonStreamingEndpoints = new Set<string>()
const NON_STREAMING_ENDPOINT_CACHE_SIZE = 32
const MAX_ERROR_BODY_CHARS = 2_000

export class AiRequestError extends Error {
  readonly status: number | null
  readonly transient: boolean
  readonly retryAfterMs: number | null

  constructor(
    message: string,
    options: {
      status?: number | null
      transient: boolean
      retryAfterMs?: number | null
      cause?: unknown
    },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AiRequestError'
    this.status = options.status ?? null
    this.transient = options.transient
    this.retryAfterMs = options.retryAfterMs ?? null
  }
}

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

function streamingCapabilityKey(provider: string, endpoint: string, settings: AiSettings, request: AiRequest): string {
  return `${provider}:${endpoint}:${modelForRequest(settings, request)}`
}

function rememberNonStreamingEndpoint(key: string) {
  nonStreamingEndpoints.delete(key)
  nonStreamingEndpoints.add(key)
  while (nonStreamingEndpoints.size > NON_STREAMING_ENDPOINT_CACHE_SIZE) {
    const oldest = nonStreamingEndpoints.values().next().value
    if (typeof oldest !== 'string') break
    nonStreamingEndpoints.delete(oldest)
  }
}

function userPayload(request: AiRequest): string {
  if (!request.surroundingContext) return request.content
  return `选中内容：\n${request.content}\n\n相邻上下文：\n${request.surroundingContext}`
}

function boundedErrorText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= MAX_ERROR_BODY_CHARS) return trimmed
  return `${trimmed.slice(0, MAX_ERROR_BODY_CHARS)}…`
}

function readableErrorBody(text: string): string {
  const fallback = boundedErrorText(text)
  if (!fallback) return ''
  try {
    const parsed = asRecord(JSON.parse(text) as unknown)
    const nestedError = asRecord(parsed?.error)
    const message = nestedError?.message ?? parsed?.message
    return typeof message === 'string' && message.trim() ? boundedErrorText(message) : fallback
  } catch {
    return fallback
  }
}

function retryAfterMs(response: Response): number | null {
  const value = response.headers.get('retry-after')?.trim()
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 120_000)
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return Math.min(Math.max(0, timestamp - Date.now()), 120_000)
}

function quotaLikeMessage(text: string): boolean {
  return /usage limit|quota|billing cycle|monthly usage|credits? exhausted|insufficient (?:balance|quota)|额度|配额|用量上限|使用限额|余额不足/i.test(text)
}

function isTransientHttpFailure(status: number, text: string): boolean {
  if (status === 429) return !quotaLikeMessage(text)
  return status === 408 || status === 409 || status === 425 || status >= 500
}

function responseError(response: Response, text: string): AiRequestError {
  const message = readableErrorBody(text) || `AI 请求失败：HTTP ${response.status}`
  return new AiRequestError(message, {
    status: response.status,
    transient: isTransientHttpFailure(response.status, message),
    retryAfterMs: retryAfterMs(response),
  })
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
        throw new AiRequestError(`AI 请求超过 ${AI_REQUEST_TIMEOUT_MS / 1000} 秒，已停止等待。`, {
          transient: true,
          cause: error,
        })
      }
    }
    throw new AiRequestError('无法连接 AI Provider。请检查 API Base URL、网络连接与站点访问授权。', {
      transient: true,
      cause: error,
    })
  }
}

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('AI 返回了无法解析的 JSON。')
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) throw responseError(response, text)
  return parseJsonText(text)
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

function openAiBody(settings: AiSettings, request: AiRequest, stream?: boolean) {
  return JSON.stringify({
    model: modelForRequest(settings, request),
    temperature: request.action === 'complete' ? 0.1 : 0.2,
    ...(stream === undefined ? {} : { stream }),
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

function consumeSseEvent(event: string, onData: (data: string) => void) {
  for (const rawLine of event.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trimStart()
    if (data) onData(data)
  }
}

function consumeCompleteSseEvents(buffer: string, onData: (data: string) => void): string {
  let remainder = buffer.replace(/\r\n/g, '\n')
  let boundary = remainder.indexOf('\n\n')
  while (boundary >= 0) {
    consumeSseEvent(remainder.slice(0, boundary), onData)
    remainder = remainder.slice(boundary + 2)
    boundary = remainder.indexOf('\n\n')
  }
  return remainder
}

type StreamBodyResult = { kind: 'sse' } | { kind: 'text'; text: string }

async function readStreamingOrText(
  response: Response,
  onData: (data: string) => void,
): Promise<StreamBodyResult> {
  if (!response.body) return { kind: 'text', text: await response.text() }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let sse = isEventStream(response)
  let buffer = ''
  let probe = ''

  const drainAsText = async (initial: string): Promise<StreamBodyResult> => {
    let text = initial
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    return { kind: 'text', text }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })

    if (!sse) {
      probe += chunk
      const normalizedProbe = probe.replace(/\r\n/g, '\n')
      const trimmed = normalizedProbe.trimStart()
      if (/^(?::|data:|event:)/.test(trimmed)) {
        sse = true
        buffer = consumeCompleteSseEvents(normalizedProbe, onData)
        probe = ''
        continue
      }
      if (trimmed.startsWith('{') || normalizedProbe.length >= 128 || normalizedProbe.includes('\n')) {
        return drainAsText(probe)
      }
      continue
    }

    buffer = consumeCompleteSseEvents(buffer + chunk, onData)
  }

  const tail = decoder.decode()
  if (!sse) return { kind: 'text', text: probe + tail }

  buffer = consumeCompleteSseEvents(buffer + tail, onData)
  if (buffer.trim()) consumeSseEvent(buffer, onData)
  return { kind: 'sse' }
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
        body: openAiBody(settings, request),
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
    const streamKey = streamingCapabilityKey('openai-compatible', endpoint, settings, request)
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
        body: openAiBody(settings, request, true),
      },
      signal,
    )

    if (!response.ok) {
      const text = await response.text()
      if (isUnsupportedStreaming(response.status, text)) {
        rememberNonStreamingEndpoint(streamKey)
        return fallbackCompletion(this, settings, request, onPartial, signal)
      }
      throw responseError(response, text)
    }

    let accumulated = ''
    const body = await readStreamingOrText(response, (data) => {
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

    if (body.kind === 'text') {
      rememberNonStreamingEndpoint(streamKey)
      const text = extractOpenAIContent(parseJsonText(body.text))
      onPartial(text)
      return text
    }

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
    const streamKey = streamingCapabilityKey('anthropic', endpoint, settings, request)
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
        rememberNonStreamingEndpoint(streamKey)
        return fallbackCompletion(this, settings, request, onPartial, signal)
      }
      throw responseError(response, text)
    }

    let accumulated = ''
    const body = await readStreamingOrText(response, (data) => {
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

    if (body.kind === 'text') {
      rememberNonStreamingEndpoint(streamKey)
      const text = extractAnthropicContent(parseJsonText(body.text))
      onPartial(text)
      return text
    }

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
