import type { AiPreferences, PreferencesRepository } from '../../storage/preferencesRepository'
import { parseStoredAiPreferences } from '../../storage/preferencesRepository'
import { AI_API_KEY_SECRET, type SecretName, type SecretStore } from '../../storage/secretStore'

const AI_SETTINGS_KEY = 'promptnote.aiSettings.v1'

type StoredAiSettings = Record<string, unknown>

export class ChromeAiSettingsStore implements PreferencesRepository, SecretStore {
  private writeQueue: Promise<void> = Promise.resolve()

  private enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(operation, operation)
    this.writeQueue = next.catch(() => undefined)
    return next
  }

  private async readStored(): Promise<StoredAiSettings | null> {
    const result = await chrome.storage.local.get(AI_SETTINGS_KEY)
    const value = result[AI_SETTINGS_KEY]
    return value && typeof value === 'object' ? (value as StoredAiSettings) : null
  }

  private async updateStored(update: (current: StoredAiSettings | null) => StoredAiSettings): Promise<void> {
    await this.enqueueWrite(async () => {
      const current = await this.readStored()
      await chrome.storage.local.set({ [AI_SETTINGS_KEY]: update(current) })
    })
  }

  async load(): Promise<AiPreferences> {
    return parseStoredAiPreferences(await this.readStored())
  }

  async save(preferences: AiPreferences): Promise<void> {
    await this.updateStored((current) => ({
      ...preferences,
      apiKey: typeof current?.apiKey === 'string' ? current.apiKey : '',
    }))
  }

  async get(name: SecretName): Promise<string | null> {
    assertAiApiKey(name)
    const current = await this.readStored()
    return typeof current?.apiKey === 'string' ? current.apiKey : null
  }

  async set(name: SecretName, value: string): Promise<void> {
    assertAiApiKey(name)
    await this.updateStored((current) => ({ ...(current ?? {}), apiKey: value }))
  }

  async remove(name: SecretName): Promise<void> {
    assertAiApiKey(name)
    await this.updateStored((current) => ({ ...(current ?? {}), apiKey: '' }))
  }
}

function assertAiApiKey(name: SecretName): void {
  if (name !== AI_API_KEY_SECRET) throw new Error(`不支持的凭据键：${name}`)
}
