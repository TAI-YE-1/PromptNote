import type { AiSettings } from '../ai/types'

const AI_SETTINGS_KEY = 'promptnote.aiSettings.v1'

export const defaultAiSettings: AiSettings = {
  enabled: true,
  configured: false,
  completionEnabled: false,
  completionContextChars: 320,
  completionDelayMs: 300,
  provider: 'openai-compatible',
  model: '',
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  scope: 'selection',
}

export interface AiSettingsRepository {
  load(): Promise<AiSettings>
  save(settings: AiSettings): Promise<void>
}

export class ChromeAiSettingsRepository implements AiSettingsRepository {
  async load(): Promise<AiSettings> {
    const result = await chrome.storage.local.get(AI_SETTINGS_KEY)
    const value = result[AI_SETTINGS_KEY]
    if (!value || typeof value !== 'object') return defaultAiSettings

    const stored = value as Partial<AiSettings>
    const legacyUnverified = !Object.hasOwn(stored, 'completionEnabled')
    return {
      ...defaultAiSettings,
      ...stored,
      configured: legacyUnverified ? false : Boolean(stored.configured),
      completionEnabled: legacyUnverified ? false : Boolean(stored.completionEnabled),
      completionContextChars: isCompletionContextChars(stored.completionContextChars)
        ? stored.completionContextChars
        : defaultAiSettings.completionContextChars,
      completionDelayMs: isCompletionDelayMs(stored.completionDelayMs)
        ? stored.completionDelayMs
        : defaultAiSettings.completionDelayMs,
    }
  }

  async save(settings: AiSettings): Promise<void> {
    await chrome.storage.local.set({ [AI_SETTINGS_KEY]: settings })
  }
}

function isCompletionContextChars(value: unknown): value is AiSettings['completionContextChars'] {
  return value === 160 || value === 320 || value === 640
}

function isCompletionDelayMs(value: unknown): value is AiSettings['completionDelayMs'] {
  return value === 150 || value === 300 || value === 600
}
