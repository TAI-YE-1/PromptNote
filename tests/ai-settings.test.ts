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

  it('defaults inline completion to off when no AI settings exist', async () => {
    const repository = new ChromeAiSettingsRepository()
    await expect(repository.load()).resolves.toEqual(defaultAiSettings)
    expect(defaultAiSettings.completionEnabled).toBe(false)
  })

  it('requires re-verification for settings saved before completion existed', async () => {
    store.set('promptnote.aiSettings.v1', {
      enabled: true,
      configured: true,
      provider: 'openai-compatible',
      model: 'legacy-model',
      baseUrl: 'https://example.com',
      apiKey: 'legacy-secret',
      scope: 'selection',
    })

    const repository = new ChromeAiSettingsRepository()
    const loaded = await repository.load()

    expect(loaded.configured).toBe(false)
    expect(loaded.completionEnabled).toBe(false)
  })

  it('stores verified AI preferences separately from PromptDocument content', async () => {
    const repository = new ChromeAiSettingsRepository()
    const settings: AiSettings = {
      enabled: true,
      configured: true,
      completionEnabled: true,
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
