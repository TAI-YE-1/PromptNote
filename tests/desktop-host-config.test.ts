/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Desktop host boundary', () => {
  it('pins the Desktop runtime to Tauri 2 with one main window', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const config = JSON.parse(read('src-tauri/tauri.conf.json')) as {
      identifier: string
      app: { windows: Array<{ label: string }> }
    }

    expect(cargo).toContain('tauri = { version = "2"')
    expect(cargo).toContain('tauri-plugin-single-instance = "2"')
    expect(config.identifier).toBe('com.promptnote.desktop')
    expect(config.app.windows.map((window) => window.label)).toEqual(['main'])
  })

  it('keeps capabilities minimal and does not enable shell or filesystem plugins', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const capability = JSON.parse(read('src-tauri/capabilities/main-window.json')) as {
      permissions: string[]
    }

    expect(capability.permissions).toEqual(['core:default'])
    expect(cargo).not.toContain('tauri-plugin-shell')
    expect(cargo).not.toContain('tauri-plugin-fs')
  })

  it('wakes and focuses the existing main window on a second launch', () => {
    const host = read('src-tauri/src/lib.rs')

    expect(host).toContain('tauri_plugin_single_instance::init')
    expect(host).toContain('get_webview_window("main")')
    expect(host).toContain('window.show()')
    expect(host).toContain('window.unminimize()')
    expect(host).toContain('window.set_focus()')
  })

  it('keeps the Desktop entry free of Browser host adapters', () => {
    const entry = read('src/desktop.tsx')

    expect(entry).not.toContain('platform/browser')
    expect(entry).not.toMatch(/\bchrome\./)
  })
})
