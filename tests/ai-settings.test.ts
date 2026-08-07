import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ChromeAiSettingsRepository,
  defaultAiSettings,
} from '../src/storage/aiSettingsRepository'
import type { AiSettings } from '../src/ai/types'

const store = new Map<string, unknown>()

function installChromeStorageMock() {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        async get(key: string) {
          return { [key]: structuredClone(store.get(key)) }
        },
        async set(items: Record<string, unknown>) {
          for (const [key, value] of Object.entries(items)) store.set(key, structuredClone(value))
        },
      },
    },
  })
}

describe('ChromeAiSettingsRepository', () => {
  beforeEach(() => {
    store.clear()
    vi.unstubAllGlobals()
    installChromeStorageMock()
  })

  it('returns a disabled-network-safe default when no AI settings exist', async () => {
    const repository = new ChromeAiSettingsRepository()
    await expect(repository.load()).resolves.toEqual(defaultAiSettings)
  })

  it('stores AI preferences separately from PromptDocument content', async () => {
    const repository = new ChromeAiSettingsRepository()
    const settings: AiSettings = {
      enabled: true,
      configured: true,
      provider: 'openai-compatible',
      model: 'test-model',
      baseUrl: 'https://example.com',
      apiKey: 'local-secret',
      scope: 'selection',
    }

    await repository.save(settings)

    await expect(repository.load()).resolves.toEqual(settings)
    expect([...store.keys()]).toEqual(['promptnote.aiSettings.v1'])
  })
})
