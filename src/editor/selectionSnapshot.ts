import type { EditorState } from '@tiptap/pm/state'
import { getActiveBlockFormat, type EditableBlockFormat } from './blockConversion'

export interface EditorSelectionSnapshot {
  text: string
  from: number
  to: number
  blockFormat: EditableBlockFormat | null
}

export function buildEditorSelectionSnapshot(state: EditorState): EditorSelectionSnapshot | null {
  const { selection } = state
  if (selection.empty) return null

  return {
    text: state.doc.textBetween(selection.from, selection.to, '\n'),
    from: selection.from,
    to: selection.to,
    blockFormat: getActiveBlockFormat(state)?.format ?? null,
  }
}
