export type InsertPlacement = 'selection' | 'caret' | 'end'

export type ContentRequest = {
  type: 'PROMPTNOTE_INSERT_AT_CARET'
  text: string
}

export type ContentResponse =
  | { ok: true; placement: InsertPlacement }
  | { ok: false; error: string }
