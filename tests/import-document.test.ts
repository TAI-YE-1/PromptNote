import { describe, expect, it } from 'vitest'
import { resolveImportedDocument } from '../src/app/importDocument'
import { createPromptDocument } from '../src/prompt/schema'

describe('import document conflict resolution', () => {
  it('keeps a non-conflicting import unchanged', () => {
    const imported = createPromptDocument('备份')
    expect(resolveImportedDocument(imported, null, false)).toBe(imported)
  })

  it('rebases an explicit same-id overwrite above both revisions', () => {
    const existing = { ...createPromptDocument('当前'), id: 'same', revision: 12 }
    const imported = { ...createPromptDocument('备份'), id: 'same', revision: 4 }

    const resolved = resolveImportedDocument(imported, existing, true, {
      now: () => '2026-08-08T20:00:00.000Z',
    })

    expect(resolved.id).toBe('same')
    expect(resolved.title).toBe('备份')
    expect(resolved.revision).toBe(13)
    expect(resolved.updatedAt).toBe('2026-08-08T20:00:00.000Z')
  })

  it('creates a distinct copy when overwrite is declined', () => {
    const existing = { ...createPromptDocument('当前'), id: 'same', revision: 12 }
    const imported = { ...createPromptDocument('备份'), id: 'same', revision: 4 }

    const resolved = resolveImportedDocument(imported, existing, false, {
      now: () => '2026-08-08T20:00:00.000Z',
      newId: () => 'copy-id',
    })

    expect(resolved.id).toBe('copy-id')
    expect(resolved.title).toBe('备份（导入）')
    expect(resolved.revision).toBe(5)
  })
})
