import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSettings } from '../src/ai/types'
import { ChromeAiSettingsStore } from '../src/platform/browser/aiSettingsStore'
import {
  defaultAiPreferences,
  toAiPreferences,
  withAiSecret,
} from '../src/storage/preferencesRepository'
import { AI_API_KEY_SECRET } from '../src/storage/secretStore'

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

describe('ChromeAiSettingsStore', () => {
  beforeEach(() => {
    store.clear()
    vi.unstubAllGlobals()
    installChromeStorageMock()
  })

  it('defaults inline completion to off and exposes no secret when settings do not exist', async () => {
    const repository = new ChromeAiSettingsStore()
    await expect(repository.load()).resolves.toEqual(defaultAiPreferences)
    await expect(repository.get(AI_API_KEY_SECRET)).resolves.toBeNull()
    expect(defaultAiPreferences.completionEnabled).toBe(false)
    expect(defaultAiPreferences.completionContextChars).toBe(320)
    expect(defaultAiPreferences.completionDelayMs).toBe(300)
  })

  it('keeps the legacy Chrome key layout while requiring re-verification for pre-completion settings', async () => {
    store.set('promptnote.aiSettings.v1', {
      enabled: true,
      configured: true,
      provider: 'openai-compatible',
      model: 'legacy-model',
      baseUrl: 'https://example.com',
      apiKey: 'legacy-secret',
      scope: 'selection',
    })

    const repository = new ChromeAiSettingsStore()
    const preferences = await repository.load()

    expect(preferences.configured).toBe(false)
    expect(preferences.completionEnabled).toBe(false)
    expect(preferences.completionContextChars).toBe(320)
    expect(preferences.completionDelayMs).toBe(300)
    expect(preferences.completionModel).toBe('')
    expect(preferences.instructionOverrides).toEqual({})
    await expect(repository.get(AI_API_KEY_SECRET)).resolves.toBe('legacy-secret')
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

    const repository = new ChromeAiSettingsStore()
    const preferences = await repository.load()
    expect(preferences.configured).toBe(true)
    expect(preferences.completionEnabled).toBe(true)
    expect(preferences.completionContextChars).toBe(320)
    expect(preferences.completionDelayMs).toBe(300)
    expect(preferences.completionModel).toBe('')
    await expect(repository.get(AI_API_KEY_SECRET)).resolves.toBe('secret')
  })

  it('falls back from invalid persisted tuning values without losing connection state', async () => {
    store.set('promptnote.aiSettings.v1', {
      ...defaultAiPreferences,
      configured: true,
      completionEnabled: true,
      completionContextChars: 999_999,
      completionDelayMs: 0,
      apiKey: 'secret',
    })

    const loaded = await new ChromeAiSettingsStore().load()
    expect(loaded.configured).toBe(true)
    expect(loaded.completionContextChars).toBe(320)
    expect(loaded.completionDelayMs).toBe(300)
  })

  it('stores preferences and credential through separate contracts without changing the Browser storage shape', async () => {
    const repository = new ChromeAiSettingsStore()
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

    await repository.save(toAiPreferences(settings))
    await repository.set(AI_API_KEY_SECRET, settings.apiKey)

    const preferences = await repository.load()
    const apiKey = await repository.get(AI_API_KEY_SECRET)
    expect(withAiSecret(preferences, apiKey)).toEqual(settings)
    expect([...store.keys()]).toEqual(['promptnote.aiSettings.v1'])
    expect(store.get('promptnote.aiSettings.v1')).toEqual(settings)
  })

  it('clears only the credential while preserving non-sensitive preferences', async () => {
    const repository = new ChromeAiSettingsStore()
    const settings: AiSettings = {
      ...withAiSecret(defaultAiPreferences, 'secret'),
      configured: true,
      model: 'test-model',
    }
    await repository.save(toAiPreferences(settings))
    await repository.set(AI_API_KEY_SECRET, 'secret')
    await repository.remove(AI_API_KEY_SECRET)

    await expect(repository.load()).resolves.toEqual(toAiPreferences(settings))
    await expect(repository.get(AI_API_KEY_SECRET)).resolves.toBe('')
    expect(store.get('promptnote.aiSettings.v1')).toEqual({ ...toAiPreferences(settings), apiKey: '' })
  })
})
