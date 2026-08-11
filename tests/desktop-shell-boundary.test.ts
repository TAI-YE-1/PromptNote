/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Desktop shell architecture', () => {
  it('keeps one controller and the four frozen shell modes', () => {
    const shell = read('src-tauri/src/shell.rs')
    const host = read('src-tauri/src/lib.rs')

    expect(shell).toContain('pub struct ShellController')
    expect(shell).toContain('TrayBackground,')
    expect(shell).toContain('Orb,')
    expect(shell).toContain('DockedPanel,')
    expect(shell).toContain('FullWindow,')
    expect(host).toContain('app.manage(shell)')
    expect(host).toContain('app.state::<ShellController>()')
    expect(host).not.toContain('struct PanelController')
    expect(host).not.toContain('struct OrbController')
  })

  it('keeps the exact V1 tray surface and makes Exit the only explicit termination action', () => {
    const shell = read('src-tauri/src/shell.rs')

    for (const label of [
      'Open PromptNote',
      'New Prompt',
      'Show / Hide Floating Orb',
      'Settings',
      'Exit PromptNote',
    ]) {
      expect(shell).toContain(`"${label}"`)
    }
    expect(shell).toContain('emit_host_command(app, "new-prompt")')
    expect(shell).toContain('emit_host_command(app, "settings")')
    expect(shell).toContain('controller.exit(app)')
    expect(shell.match(/app\.exit\(0\)/g)).toHaveLength(1)
  })

  it('uses the same main WebView for Panel and Full Window', () => {
    const shell = read('src-tauri/src/shell.rs')
    const desktop = read('src/desktop.tsx')
    const orb = read('src/orb.ts')

    expect(shell).toContain('pub fn show_full_window')
    expect(shell).toContain('pub fn show_panel')
    expect(shell.match(/let main = main_window\(app\)\?;/g)?.length).toBeGreaterThanOrEqual(2)
    expect(desktop).toContain('<PromptNoteApp')
    expect(desktop).toContain('hostCommand={hostCommand}')
    expect(orb).not.toContain('PromptNoteApp')
  })

  it('keeps Panel geometry inside monitor work area and Always-on-top user-controllable', () => {
    const shell = read('src-tauri/src/shell.rs')
    const desktop = read('src/desktop.tsx')

    expect(shell).toContain('const PANEL_WIDTH_LOGICAL: f64 = 420.0;')
    expect(shell).toContain('let work = monitor.work_area();')
    expect(shell).toContain('main.set_size(PhysicalSize::new(width, work.size.height))')
    expect(shell).toContain('main.set_skip_taskbar(true)')
    expect(shell).toContain('main.set_always_on_top(preferences.panel_always_on_top)')
    expect(shell).toContain('pub fn set_panel_always_on_top')
    expect(desktop).toContain('setPanelAlwaysOnTop(!shell.panelAlwaysOnTop)')
  })

  it('keeps Full Window on normal Windows window semantics', () => {
    const shell = read('src-tauri/src/shell.rs')

    expect(shell).toContain('main.set_decorations(true)')
    expect(shell).toContain('main.set_resizable(true)')
    expect(shell).toContain('main.set_maximizable(true)')
    expect(shell).toContain('main.set_minimizable(true)')
    expect(shell).toContain('main.set_skip_taskbar(false)')
    expect(shell).toContain('main.set_always_on_top(false)')
  })

  it('keeps Orb compact, click-driven, draggable, snapping, persistent, and idle-half-hidden', () => {
    const shell = read('src-tauri/src/shell.rs')
    const orb = read('src/orb.ts')
    const orbHtml = read('orb.html')

    expect(shell).toContain('const ORB_SIZE_LOGICAL: f64 = 48.0;')
    expect(shell).toContain('const ORB_IDLE_VISIBLE_LOGICAL: f64 = 20.0;')
    expect(shell).toContain('WebviewUrl::App("orb.html".into())')
    expect(shell).toContain('.always_on_top(true)')
    expect(shell).toContain('.skip_taskbar(true)')
    expect(shell).toContain('preferences.monitor_name = monitor.name().cloned()')
    expect(shell).toContain('preferences.edge = edge')
    expect(shell).toContain('preferences.y_ratio = y_ratio')
    expect(orbHtml).toContain('/icons/icon-48.png')
    expect(orb).toContain("orb.addEventListener('pointerenter', reveal)")
    expect(orb).toContain('startOrbDrag()')
    expect(orb).toContain('snapOrb()')
    expect(orb).toContain('showDockedPanel()')
    expect(orb).toContain('setOrbIdle(true)')
    expect(orb).not.toContain("addEventListener('mouseenter', showDockedPanel")
    expect(orb).not.toContain("addEventListener('pointerenter', showDockedPanel")
  })

  it('separates main AI network capability from the minimal Orb capability', () => {
    const mainCapability = JSON.parse(read('src-tauri/capabilities/main-window.json')) as {
      windows: string[]
      permissions: Array<string | { identifier: string }>
    }
    const orbCapability = JSON.parse(read('src-tauri/capabilities/orb-window.json')) as {
      windows: string[]
      permissions: Array<string | { identifier: string }>
    }
    const config = JSON.parse(read('src-tauri/tauri.conf.json')) as {
      app: { security: { capabilities: string[] } }
    }

    expect(mainCapability.windows).toEqual(['main'])
    expect(mainCapability.permissions).toContainEqual(expect.objectContaining({ identifier: 'http:default' }))
    expect(orbCapability.windows).toEqual(['orb'])
    expect(orbCapability.permissions).toEqual(['core:default'])
    expect(config.app.security.capabilities).toEqual(['main-window', 'orb-window'])
  })

  it('builds both Desktop entrypoints into the single Tauri frontendDist', () => {
    const vite = read('vite.desktop.config.mjs')
    const config = JSON.parse(read('src-tauri/tauri.conf.json')) as {
      build: { frontendDist: string }
    }

    expect(vite).toContain("desktop: resolve(process.cwd(), 'desktop.html')")
    expect(vite).toContain("orb: resolve(process.cwd(), 'orb.html')")
    expect(config.build.frontendDist).toBe('../dist-desktop')
  })
})
