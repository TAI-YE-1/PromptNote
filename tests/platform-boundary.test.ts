/// <reference types="node" />

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SHARED_DIRECTORIES = ['src/app', 'src/ai', 'src/editor', 'src/prompt', 'src/storage']

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name)
    if (entry.isDirectory()) return sourceFiles(child)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [child] : []
  })
}

describe('shared platform boundary', () => {
  it('keeps shared app, AI, editor, prompt and storage code free of Chrome and Tauri APIs', () => {
    const offenders = SHARED_DIRECTORIES.flatMap(sourceFiles).filter((path) => {
      const source = readFileSync(path, 'utf8')
      return /\bchrome\./.test(source) || /@tauri-apps|\b__TAURI__\b/.test(source)
    })

    expect(offenders).toEqual([])
  })
})
