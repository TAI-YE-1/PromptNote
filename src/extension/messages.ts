export interface ComposerState {
  supported: boolean
  hasContent: boolean
  text: string
}

export type InsertMode = 'append' | 'replace'

export type ContentRequest =
  | { type: 'PROMPTNOTE_GET_COMPOSER_STATE' }
  | { type: 'PROMPTNOTE_INSERT'; text: string; mode: InsertMode }

export type ContentResponse =
  | { ok: true; state?: ComposerState }
  | { ok: false; error: string }
