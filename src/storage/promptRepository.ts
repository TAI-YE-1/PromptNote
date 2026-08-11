import type { PromptDocument } from '../prompt/schema'

export interface PromptRepository {
  list(): Promise<PromptDocument[]>
  get(id: string): Promise<PromptDocument | null>
  save(document: PromptDocument): Promise<void>
  remove(id: string): Promise<void>
  getCurrentId(): Promise<string | null>
  setCurrentId(id: string): Promise<void>
  ensureCurrent(): Promise<PromptDocument>
}
