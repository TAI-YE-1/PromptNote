import { invoke } from '@tauri-apps/api/core'
import {
  parseStoredAiPreferences,
  type AiPreferences,
  type PreferencesRepository,
} from '../../storage/preferencesRepository'

export class DesktopPreferencesRepository implements PreferencesRepository {
  async load(): Promise<AiPreferences> {
    const raw = await invoke<unknown | null>('preferences_load')
    return parseStoredAiPreferences(raw ?? {})
  }

  async save(preferences: AiPreferences): Promise<void> {
    await invoke('preferences_save', { preferences })
  }
}
