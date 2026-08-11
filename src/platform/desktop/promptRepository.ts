import { invoke } from '@tauri-apps/api/core'
import { createPromptDocument, parsePromptDocument, type PromptDocument } from '../../prompt/schema'
import type { PromptRepository } from '../../storage/promptRepository'

export class DesktopPromptRepository implements PromptRepository {
  async list(): Promise<PromptDocument[]> {
    const raw = await invoke<unknown[]>('prompt_list')
    return raw.map(parsePromptDocument)
  }

  async get(id: string): Promise<PromptDocument | null> {
    const raw = await invoke<unknown | null>('prompt_get', { id })
    return raw === null ? null : parsePromptDocument(raw)
  }

  async save(document: PromptDocument): Promise<void> {
    await invoke('prompt_save', { document: parsePromptDocument(document) })
  }

  async remove(id: string): Promise<void> {
    await invoke('prompt_remove', { id })
  }

  async getCurrentId(): Promise<string | null> {
    return invoke<string | null>('prompt_get_current_id')
  }

  async setCurrentId(id: string): Promise<void> {
    await invoke('prompt_set_current_id', { id })
  }

  async ensureCurrent(): Promise<PromptDocument> {
    const currentId = await this.getCurrentId()
    if (currentId) {
      const current = await this.get(currentId)
      if (current) return current
    }

    const documents = await this.list()
    const next = documents[0] ?? createPromptDocument()
    if (documents.length === 0) await this.save(next)
    await this.setCurrentId(next.id)
    return next
  }
}
