import type { EditorState } from '@tiptap/pm/state'
import { isSectionKind, type SectionKind } from '../prompt/sectionKinds'

export interface EditorCompletionContext {
  key: string
  documentId: string
  documentVersion: number
  position: number
  blockStart: number
  beforeText: string
  sectionKind: SectionKind | null
}

export interface EditorCompletionSuggestion {
  text: string
  contextKey: string
  documentId: string
  position: number
}

export function buildEditorCompletionContext(
  state: EditorState,
  options: {
    documentId: string
    documentVersion: number
    maxChars: number
  },
): EditorCompletionContext | null {
  const { selection } = state
  if (options.maxChars <= 0 || !selection.empty) return null

  const $from = selection.$from
  const parent = $from.parent
  if (!parent.isTextblock) return null

  const beforeText = parent
    .textBetween(0, $from.parentOffset, '\n', '\n')
    .slice(-options.maxChars)
  if (!beforeText.trim()) return null

  const sectionKind =
    parent.type.name === 'promptSection' && isSectionKind(parent.attrs.kind)
      ? parent.attrs.kind
      : null
  const blockStart = $from.start()
  const key = [
    options.documentId,
    options.documentVersion,
    blockStart,
    selection.from,
    sectionKind ?? '',
    beforeText,
  ].join('\u0000')

  return {
    key,
    documentId: options.documentId,
    documentVersion: options.documentVersion,
    position: selection.from,
    blockStart,
    beforeText,
    sectionKind,
  }
}
