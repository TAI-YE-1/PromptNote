import type { ComposerState, InsertMode } from '../extension/messages'

export interface WebPromptAdapter {
  id: string
  canHandle(url: URL): boolean
  readComposer(): ComposerState
  insert(text: string, mode: InsertMode): void
}
