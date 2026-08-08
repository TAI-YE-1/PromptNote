import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChromePromptRepository } from '../src/storage/promptRepository'
import type { PromptDocument } from '../src/prompt/schema'

const store = new Map<string, unknown>()

function document(id: string, revision: number, title: string): PromptDocument {
  return {
    id,
    title,
    schemaVersion: 1,
    revision,
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: `2026-08-08T00:00:0${Math.min(revision, 9)}.000Z`,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }] },
  }
}

function installStorage() {
  const get = vi.fn(async (keys: string | string[]) => {
    const requested = Array.isArray(keys) ? keys : [keys]
    return Object.fromEntries(requested.map((key) => [key, structuredClone(store.get(key))]))
  })
  const set = vi.fn(async (items: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(items)) store.set(key, structuredClone(value))
  })
  vi.stubGlobal('chrome', { storage: { local: { get, set } } })
  return { get, set }
}

describe('PromptRepository invariants', () => {
  beforeEach(() => {
    store.clear()
    vi.unstubAllGlobals()
  })

  it('never lets an older revision overwrite a newer stored document', async () => {
    installStorage()
    const repository = new ChromePromptRepository()
    await repository.save(document('same', 3, 'newer'))
    await repository.save(document('same', 2, 'older'))

    expect(await repository.get('same')).toMatchObject({ revision: 3, title: 'newer' })
  })

  it('loads documents and current id in one storage read when current document exists', async () => {
    const { get } = installStorage()
    store.set('promptnote.documents.v1', { current: document('current', 1, 'Current') })
    store.set('promptnote.currentDocumentId.v1', 'current')

    const repository = new ChromePromptRepository()
    await expect(repository.ensureCurrent()).resolves.toMatchObject({ id: 'current' })
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(['promptnote.documents.v1', 'promptnote.currentDocumentId.v1'])
  })
})
