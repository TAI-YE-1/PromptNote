/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveImportedDocument } from '../src/app/importDocument'
import {
  createPromptDocument,
  createPromptDocumentExport,
  parsePromptDocumentExport,
} from '../src/prompt/schema'

const root = resolve(import.meta.dirname, '..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Browser / Desktop backup compatibility', () => {
  it('round-trips the exact same Prompt JSON backup contract across hosts', () => {
    const source = { ...createPromptDocument('跨宿主'), id: 'shared-id', revision: 7 }
    const browserBackup = createPromptDocumentExport(source)
    const serialized = JSON.stringify(browserBackup)
    const desktopImport = parsePromptDocumentExport(JSON.parse(serialized) as unknown)

    expect(desktopImport.document).toEqual(source)

    const desktopBackup = createPromptDocumentExport(desktopImport.document)
    const browserImport = parsePromptDocumentExport(
      JSON.parse(JSON.stringify(desktopBackup)) as unknown,
    )
    expect(browserImport.document).toEqual(source)
  })

  it('rebases a same-id overwrite above both host revisions', () => {
    const existing = { ...createPromptDocument('Desktop 当前'), id: 'same', revision: 21 }
    const imported = { ...createPromptDocument('Browser 备份'), id: 'same', revision: 6 }

    const resolved = resolveImportedDocument(imported, existing, true, {
      now: () => '2026-08-11T07:20:00.000Z',
    })

    expect(resolved.id).toBe('same')
    expect(resolved.revision).toBe(22)
    expect(resolved.updatedAt).toBe('2026-08-11T07:20:00.000Z')
  })

  it('keeps backup creation and parsing in the shared PromptNoteApp instead of host adapters', () => {
    const app = read('src/app/PromptNoteApp.tsx')
    const browserEntry = read('src/main.tsx')
    const desktopEntry = read('src/desktop.tsx')
    const browserRepository = read('src/platform/browser/promptRepository.ts')
    const desktopRepository = read('src/platform/desktop/promptRepository.ts')

    expect(app).toContain('createPromptDocumentExport(current)')
    expect(app).toContain('parsePromptDocumentExport(raw)')
    expect(app).toContain('resolveImportedDocument(backup.document, existing, overwrite)')
    expect(browserEntry).toContain('<PromptNoteApp')
    expect(desktopEntry).toContain('<PromptNoteApp')
    expect(browserRepository).not.toMatch(/backup|exportedAt|parsePromptDocumentExport/i)
    expect(desktopRepository).not.toMatch(/backup|exportedAt|parsePromptDocumentExport/i)
  })

  it('keeps Browser and Desktop persistence local and separate', () => {
    const browserRepository = read('src/platform/browser/promptRepository.ts')
    const desktopRepository = read('src/platform/desktop/promptRepository.ts')
    const desktopStorage = read('src-tauri/src/storage.rs')

    expect(browserRepository).toContain('chrome.storage.local')
    expect(desktopRepository).toContain("invoke<unknown[]>('prompt_list')")
    expect(desktopStorage).toContain('promptnote.sqlite3')
    expect(browserRepository).not.toContain('promptnote.sqlite3')
    expect(desktopRepository).not.toContain('chrome.storage.local')
  })

  it('does not add an account, cloud backend, or automatic sync dependency', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }
    const dependencyNames = Object.keys(dependencies).join('\n')

    expect(dependencyNames).not.toMatch(/firebase|supabase|appwrite|pocketbase|aws-amplify|convex/i)
    expect(read('README.md')).toContain('两边数据彼此独立，不会自动同步')
    expect(read('README.md')).toContain('没有 PromptNote 账号、云端数据后端')
  })
})
