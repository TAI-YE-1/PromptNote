/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Desktop host boundary', () => {
  it('pins the Desktop runtime to Tauri 2 with one main window and valid Windows icon', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const config = JSON.parse(read('src-tauri/tauri.conf.json')) as {
      identifier: string
      app: { windows: Array<{ label: string }> }
    }
    const iconPath = resolve(root, 'src-tauri/icons/icon.ico')

    expect(cargo).toContain('tauri = "=2.11.5"')
    expect(cargo).toContain('tauri-plugin-single-instance = "=2.4.3"')
    expect(cargo).toContain('tauri-plugin-http = "=2.5.9"')
    expect(config.identifier).toBe('com.promptnote.desktop')
    expect(config.app.windows.map((window) => window.label)).toEqual(['main'])
    expect(existsSync(iconPath)).toBe(true)
    expect([...readFileSync(iconPath).subarray(0, 6)]).toEqual([0, 0, 1, 0, 1, 0])
  })

  it('keeps capabilities minimal while allowing only HTTPS and local AI HTTP traffic', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const capability = JSON.parse(read('src-tauri/capabilities/main-window.json')) as {
      permissions: Array<string | { identifier: string; allow: Array<{ url: string }> }>
    }

    expect(capability.permissions).toEqual([
      'core:default',
      {
        identifier: 'http:default',
        allow: [
          { url: 'https://*:*' },
          { url: 'http://localhost:*' },
          { url: 'http://127.0.0.1:*' },
        ],
      },
    ])
    expect(cargo).not.toContain('tauri-plugin-shell')
    expect(cargo).not.toContain('tauri-plugin-fs')
  })

  it('wakes and focuses the existing main window on a second launch', () => {
    const host = read('src-tauri/src/lib.rs')

    expect(host).toContain('tauri_plugin_single_instance::init')
    expect(host).toContain('tauri_plugin_http::init()')
    expect(host).toContain('get_webview_window("main")')
    expect(host).toContain('window.show()')
    expect(host).toContain('window.unminimize()')
    expect(host).toContain('window.set_focus()')
  })

  it('mounts the shared PromptNote app with Desktop adapters only', () => {
    const entry = read('src/desktop.tsx')

    expect(entry).toContain("import { PromptNoteApp } from './app/PromptNoteApp'")
    expect(entry).toContain("./platform/desktop/promptRepository")
    expect(entry).toContain("./platform/desktop/preferencesRepository")
    expect(entry).toContain("./platform/desktop/secretStore")
    expect(entry).toContain("./platform/desktop/aiTransport")
    expect(entry).not.toContain('platform/browser')
    expect(entry).not.toMatch(/\bchrome\./)
  })
})
