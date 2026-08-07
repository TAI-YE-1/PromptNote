import type { AiSettings } from '../ai/types'

const AI_SETTINGS_KEY = 'promptnote.aiSettings.v1'

export const defaultAiSettings: AiSettings = {
  enabled: true,
  configured: false,
  completionEnabled: false,
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
    return { ...defaultAiSettings, ...(value as Partial<AiSettings>) }
  }

  async save(settings: AiSettings): Promise<void> {
    await chrome.storage.local.set({ [AI_SETTINGS_KEY]: settings })
  }
}
