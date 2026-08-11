import { invoke } from '@tauri-apps/api/core'

export interface StartupSnapshot {
  shortcutLabel: string
  shortcutRegistered: boolean
  shortcutError: string | null
  autostartEnabled: boolean
}

export function getStartupSnapshot(): Promise<StartupSnapshot> {
  return invoke<StartupSnapshot>('startup_snapshot')
}

export function setAutostart(enabled: boolean): Promise<boolean> {
  return invoke<boolean>('startup_set_autostart', { enabled })
}
