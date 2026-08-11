import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPromptDocument } from '../src/prompt/schema'
import { AI_API_KEY_SECRET } from '../src/storage/secretStore'

const tauri = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: tauri.invoke }))

import { DesktopPreferencesRepository } from '../src/platform/desktop/preferencesRepository'
import { DesktopPromptRepository } from '../src/platform/desktop/promptRepository'
import { DesktopSecretStore } from '../src/platform/desktop/secretStore'

describe('Desktop platform adapters', () => {
  beforeEach(() => {
    tauri.invoke.mockReset()
  })

  it('maps PromptRepository operations to narrow Tauri commands', async () => {
    const repository = new DesktopPromptRepository()
    const document = createPromptDocument('Desktop')
    tauri.invoke
      .mockResolvedValueOnce([document])
      .mockResolvedValueOnce(document)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(document.id)
      .mockResolvedValueOnce(undefined)

    await expect(repository.list()).resolves.toEqual([document])
    await expect(repository.get(document.id)).resolves.toEqual(document)
    await repository.save(document)
    await repository.remove(document.id)
    await expect(repository.getCurrentId()).resolves.toBe(document.id)
    await repository.setCurrentId(document.id)

    expect(tauri.invoke.mock.calls).toEqual([
      ['prompt_list'],
      ['prompt_get', { id: document.id }],
      ['prompt_save', { document }],
      ['prompt_remove', { id: document.id }],
      ['prompt_get_current_id'],
      ['prompt_set_current_id', { id: document.id }],
    ])
  })

  it('reuses the first stored document when current id is missing', async () => {
    const repository = new DesktopPromptRepository()
    const document = createPromptDocument('已有 Prompt')
    tauri.invoke
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([document])
      .mockResolvedValueOnce(undefined)

    await expect(repository.ensureCurrent()).resolves.toEqual(document)
    expect(tauri.invoke.mock.calls).toEqual([
      ['prompt_get_current_id'],
      ['prompt_list'],
      ['prompt_set_current_id', { id: document.id }],
    ])
  })

  it('keeps preferences separate from credentials', async () => {
    const repository = new DesktopPreferencesRepository()
    tauri.invoke.mockResolvedValueOnce({
      enabled: true,
      configured: false,
      completionEnabled: false,
      provider: 'openai-compatible',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    })

    const preferences = await repository.load()
    expect(preferences).not.toHaveProperty('apiKey')
    await repository.save(preferences)
    expect(tauri.invoke).toHaveBeenLastCalledWith('preferences_save', { preferences })
  })

  it('maps SecretStore only through secret commands', async () => {
    const store = new DesktopSecretStore()
    tauri.invoke
      .mockResolvedValueOnce('secret-value')
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)

    await expect(store.get(AI_API_KEY_SECRET)).resolves.toBe('secret-value')
    await store.set(AI_API_KEY_SECRET, 'next-secret')
    await store.remove(AI_API_KEY_SECRET)

    expect(tauri.invoke.mock.calls).toEqual([
      ['secret_get', { name: AI_API_KEY_SECRET }],
      ['secret_set', { name: AI_API_KEY_SECRET, value: 'next-secret' }],
      ['secret_remove', { name: AI_API_KEY_SECRET }],
    ])
  })
})
