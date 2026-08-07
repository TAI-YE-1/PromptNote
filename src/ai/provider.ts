import type { AiProvider, AiRequest, AiSettings } from './types'

function trimBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function systemInstruction(action: AiRequest['action']): string {
  const common =
    '你是 PromptNote 的局部 Prompt 辅助器。保持用户原意，不扩写无关内容，不改变事实，不接管整篇 Prompt。只返回建议正文，不要解释你的过程。'
  const actions: Record<AiRequest['action'], string> = {
    clarify: '把选中文字改得更明确、可执行。',
    shorten: '在不丢失约束和事实的前提下缩短选中文字。',
    split_constraints: '把选中文字拆成清晰、可执行的约束条目。',
    draft_acceptance: '根据给定 Prompt 生成简洁、可验证的验收标准。',
    ambiguity: '指出并改写最重要的一处歧义；只返回建议文本。',
    structure: '只给出结构整理建议，不整篇重写。',
  }
  return `${common}\n${actions[action]}`
}

function userPayload(request: AiRequest): string {
  if (!request.surroundingContext) return request.content
  return `选中内容：\n${request.content}\n\n相邻上下文：\n${request.surroundingContext}`
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(text || `AI 请求失败：HTTP ${response.status}`)
  }
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
  return content.trim()
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
  const text = pieces.join('\n').trim()
  if (!text) throw new Error('Anthropic 返回空内容。')
  return text
}

class OpenAICompatibleProvider implements AiProvider {
  async testConnection(settings: AiSettings): Promise<void> {
    await this.generate(settings, { action: 'shorten', content: '测试连接。' })
  }

  async generate(settings: AiSettings, request: AiRequest): Promise<string> {
    const response = await fetch(`${trimBaseUrl(settings.baseUrl)}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemInstruction(request.action) },
          { role: 'user', content: userPayload(request) },
        ],
      }),
    })
    return extractOpenAIContent(await readJson(response))
  }
}

class AnthropicProvider implements AiProvider {
  async testConnection(settings: AiSettings): Promise<void> {
    await this.generate(settings, { action: 'shorten', content: '测试连接。' })
  }

  async generate(settings: AiSettings, request: AiRequest): Promise<string> {
    const response = await fetch(`${trimBaseUrl(settings.baseUrl)}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 800,
        temperature: 0.2,
        system: systemInstruction(request.action),
        messages: [{ role: 'user', content: userPayload(request) }],
      }),
    })
    return extractAnthropicContent(await readJson(response))
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
