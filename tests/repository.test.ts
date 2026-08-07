import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChromePromptRepository } from '../src/storage/promptRepository'
import type { PromptDocument } from '../src/prompt/schema'

const store = new Map<string, unknown>()

function makeDocument(id: string, title: string): PromptDocument {
  return {
    id,
    title,
    schemaVersion: 1,
    revision: 0,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: title }] }] },
  }
}

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

function installChromeStorageMock(delayMs = 0) {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        async get(key: string) {
          if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
          return { [key]: clone(store.get(key)) }
        },
        async set(items: Record<string, unknown>) {
          if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
          for (const [key, value] of Object.entries(items)) store.set(key, clone(value))
        },
      },
    },
  })
}

describe('ChromePromptRepository', () => {
  beforeEach(() => {
    store.clear()
    vi.unstubAllGlobals()
  })

  it('persists and lists validated PromptDocuments', async () => {
    installChromeStorageMock()
    const repository = new ChromePromptRepository()
    await repository.save(makeDocument('a', '第一份'))
    await repository.save(makeDocument('b', '第二份'))

    expect((await repository.list()).map((document) => document.id).sort()).toEqual(['a', 'b'])
    expect((await repository.get('a'))?.title).toBe('第一份')
  })

  it('serializes concurrent saves so one document cannot erase another', async () => {
    installChromeStorageMock(4)
    const repository = new ChromePromptRepository()

    await Promise.all([
      repository.save(makeDocument('a', '第一份')),
      repository.save(makeDocument('b', '第二份')),
    ])

    expect((await repository.list()).map((document) => document.id).sort()).toEqual(['a', 'b'])
  })

  it('tracks and removes the current local document explicitly', async () => {
    installChromeStorageMock()
    const repository = new ChromePromptRepository()
    await repository.save(makeDocument('a', '第一份'))
    await repository.setCurrentId('a')
    expect(await repository.getCurrentId()).toBe('a')

    await repository.remove('a')
    expect(await repository.get('a')).toBeNull()
  })
})
