import { invoke } from '@tauri-apps/api/core'
import type { SecretStore } from '../../storage/secretStore'

export class DesktopSecretStore implements SecretStore {
  get(name: string): Promise<string | null> {
    return invoke<string | null>('secret_get', { name })
  }

  async set(name: string, value: string): Promise<void> {
    await invoke('secret_set', { name, value })
  }

  async remove(name: string): Promise<void> {
    await invoke('secret_remove', { name })
  }
}
