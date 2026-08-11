/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Desktop startup boundary', () => {
  it('pins the frozen Ctrl + Alt + P shortcut through the Rust host only', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const startup = read('src-tauri/src/startup.rs')
    const host = read('src-tauri/src/lib.rs')

    expect(cargo).toContain('tauri-plugin-global-shortcut = "=2.3.2"')
    expect(startup).toContain('pub const SHORTCUT_LABEL: &str = "Ctrl + Alt + P";')
    expect(startup).toContain('Modifiers::CONTROL | Modifiers::ALT')
    expect(startup).toContain('Code::KeyP')
    expect(host).toContain('tauri_plugin_global_shortcut::Builder::new()')
    expect(host).toContain('ShortcutState::Pressed')
    expect(host).toContain('shell.toggle_compact(app)')
    expect(host).not.toContain('GetAsyncKeyState')
    expect(host).not.toContain('SetWindowsHookEx')
  })

  it('preserves real shortcut registration errors instead of failing application startup', () => {
    const startup = read('src-tauri/src/startup.rs')
    const settings = read('src/DesktopSettings.tsx')

    expect(startup).toContain('match app.global_shortcut().register(promptnote_shortcut())')
    expect(startup).toContain('shortcut_registered: false')
    expect(startup).toContain('shortcut_error: Mutex::new(Some(error.to_string()))')
    expect(startup).not.toContain('register(promptnote_shortcut()).unwrap')
    expect(settings).toContain('startup.shortcutRegistered')
    expect(settings).toContain('startup.shortcutError')
    expect(settings).toContain('注册失败')
  })

  it('keeps autostart opt-in, verified, and separate from shell preferences', () => {
    const cargo = read('src-tauri/Cargo.toml')
    const startup = read('src-tauri/src/startup.rs')
    const host = read('src-tauri/src/lib.rs')
    const settings = read('src/DesktopSettings.tsx')

    expect(cargo).toContain('tauri-plugin-autostart = "=2.5.1"')
    expect(startup).toContain('pub const AUTOSTART_ARG: &str = "--autostart";')
    expect(startup).toContain('autostart.enable().map_err(error_message)?')
    expect(startup).toContain('autostart.disable().map_err(error_message)?')
    expect(startup).toContain('let actual = autostart.is_enabled().map_err(error_message)?')
    expect(startup).toContain('if actual != enabled')
    expect(host).toContain('Some(vec![startup::AUTOSTART_ARG])')
    expect(host).not.toContain('.autolaunch().enable()')
    expect(settings).toContain('title="开机启动"')
    expect(settings).toContain('setAutostart(enabled)')
  })

  it('enters Orb or Tray on autostart without focusing the shared editor window', () => {
    const startup = read('src-tauri/src/startup.rs')
    const shell = read('src-tauri/src/shell.rs')
    const host = read('src-tauri/src/lib.rs')

    expect(startup).toContain('launched_from_autostart')
    expect(host).toContain('let background_launch = startup::launched_from_autostart();')
    expect(host).toContain('.initialize(app.handle(), background_launch)')
    expect(shell).toContain('if background_launch')
    expect(shell).toContain('return self.show_background_launch(app);')
    expect(shell).toContain('hide_window(app, MAIN_LABEL)?;')
    expect(shell).toContain('.focusable(false)')
    expect(shell).toContain('.focused(false)')
  })

  it('does not let background launch overwrite the last manual shell preference', () => {
    const shell = read('src-tauri/src/shell.rs')
    const start = shell.index('fn show_background_launch')
    const end = shell.index('fn show_orb_or_tray', start)
    const background = shell.slice(start, end)

    expect(background).toContain('*self.lock_mode()? = ShellMode::Orb')
    expect(background).toContain('*self.lock_mode()? = ShellMode::TrayBackground')
    expect(background).not.toContain('set_mode_and_persist')
    expect(shell).toContain('match self.lock_preferences()?.last_mode')
  })

  it('recovers stale Full Window coordinates when the saved display disappears', () => {
    const shell = read('src-tauri/src/shell.rs')

    expect(shell).toContain('saved_bounds_visible(&main, position, bounds.size)?')
    expect(shell).toContain('main.center().map_err(error_message)?')
    expect(shell).toContain('fn rectangles_have_safe_overlap')
    expect(shell).toContain('visible_width >= 64.min(size.width)')
    expect(shell).toContain('visible_height >= 48.min(size.height)')
    expect(shell).toContain('fn offscreen_window_bounds_require_safe_visible_area()')
  })

  it('keeps Windows settings separate from AI provider settings', () => {
    const desktop = read('src/desktop.tsx')
    const app = read('src/app/PromptNoteApp.tsx')

    expect(desktop).toContain("if (command === 'settings')")
    expect(desktop).toContain('setSettingsOpen(true)')
    expect(desktop).toContain('<DesktopSettings')
    expect(app).toContain("command: 'new-prompt'")
    expect(app).not.toContain("command: 'new-prompt' | 'settings'")
    expect(app).toContain("setAiPanel(aiSettings.configured ? 'menu' : 'settings')")
  })

  it('does not introduce global input, clipboard, or accessibility surveillance', () => {
    const startup = read('src-tauri/src/startup.rs')
    const host = read('src-tauri/src/lib.rs')
    const shell = read('src-tauri/src/shell.rs')
    const combined = `${startup}\n${host}\n${shell}`

    expect(combined).not.toMatch(/GetAsyncKeyState|SetWindowsHookEx|clipboard|UIAutomation|Accessibility|screen.?read|OCR/i)
  })
})
