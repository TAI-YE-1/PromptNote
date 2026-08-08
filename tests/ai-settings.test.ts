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

  it('defaults inline completion to off with balanced tuning when no AI settings exist', async () => {
    const repository = new ChromeAiSettingsRepository()
    await expect(repository.load()).resolves.toEqual(defaultAiSettings)
    expect(defaultAiSettings.completionEnabled).toBe(false)
    expect(defaultAiSettings.completionContextChars).toBe(320)
    expect(defaultAiSettings.completionDelayMs).toBe(300)
    expect(defaultAiSettings.completionModel).toBe('')
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
    expect(loaded.completionContextChars).toBe(320)
    expect(loaded.completionDelayMs).toBe(300)
    expect(loaded.completionModel).toBe('')
    expect(loaded.instructionOverrides).toEqual({})
  })

  it('keeps verified settings while adding tuning defaults to a recent completion config', async () => {
    store.set('promptnote.aiSettings.v1', {
      enabled: true,
      configured: true,
      completionEnabled: true,
      provider: 'openai-compatible',
      model: 'current-model',
      baseUrl: 'https://example.com',
      apiKey: 'secret',
      scope: 'selection',
    })

    const loaded = await new ChromeAiSettingsRepository().load()
    expect(loaded.configured).toBe(true)
    expect(loaded.completionEnabled).toBe(true)
    expect(loaded.completionContextChars).toBe(320)
    expect(loaded.completionDelayMs).toBe(300)
    expect(loaded.completionModel).toBe('')
  })

  it('falls back from invalid persisted tuning values without losing connection state', async () => {
    store.set('promptnote.aiSettings.v1', {
      ...defaultAiSettings,
      configured: true,
      completionEnabled: true,
      completionContextChars: 999_999,
      completionDelayMs: 0,
    })

    const loaded = await new ChromeAiSettingsRepository().load()
    expect(loaded.configured).toBe(true)
    expect(loaded.completionContextChars).toBe(320)
    expect(loaded.completionDelayMs).toBe(300)
  })

  it('stores custom completion tuning, model and action instructions separately from PromptDocument content', async () => {
    const repository = new ChromeAiSettingsRepository()
    const settings: AiSettings = {
      enabled: true,
      configured: true,
      completionEnabled: true,
      completionContextChars: 96,
      completionDelayMs: 80,
      completionModel: 'fast-completion-model',
      instructionOverrides: {
        complete: '只补全一个短语。',
        shorten: '压缩到一半长度。',
      },
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
