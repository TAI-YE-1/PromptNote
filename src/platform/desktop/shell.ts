import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export type ShellMode = 'tray-background' | 'orb' | 'docked-panel' | 'full-window'
export type DockEdge = 'left' | 'right'

export interface ShellSnapshot {
  mode: ShellMode
  orbEnabled: boolean
  panelAlwaysOnTop: boolean
  edge: DockEdge
  yRatio: number
}

export type PromptNoteHostCommand = 'new-prompt' | 'settings'

export function getShellSnapshot(): Promise<ShellSnapshot> {
  return invoke<ShellSnapshot>('shell_snapshot')
}

export function showFullWindow(): Promise<void> {
  return invoke('shell_show_full')
}

export function showDockedPanel(): Promise<void> {
  return invoke('shell_show_panel')
}

export function collapseDockedPanel(): Promise<void> {
  return invoke('shell_collapse_panel')
}

export function toggleCompactShell(): Promise<void> {
  return invoke('shell_toggle_compact')
}

export function toggleOrbEnabled(): Promise<void> {
  return invoke('shell_toggle_orb')
}

export function setPanelAlwaysOnTop(enabled: boolean): Promise<void> {
  return invoke('shell_set_panel_always_on_top', { enabled })
}

export function startOrbDrag(): Promise<void> {
  return invoke('shell_start_orb_drag')
}

export function snapOrb(): Promise<void> {
  return invoke('shell_snap_orb')
}

export function setOrbIdle(idle: boolean): Promise<void> {
  return invoke('shell_set_orb_idle', { idle })
}

export function onShellSnapshot(listener: (snapshot: ShellSnapshot) => void): Promise<UnlistenFn> {
  return listen<ShellSnapshot>('promptnote:shell-state', (event) => listener(event.payload))
}

export function onHostCommand(
  listener: (command: PromptNoteHostCommand) => void,
): Promise<UnlistenFn> {
  return listen<PromptNoteHostCommand>('promptnote:host-command', (event) => listener(event.payload))
}
