import type { EditorState } from '@tiptap/pm/state'
import { isSectionKind, type SectionKind } from '../prompt/sectionKinds'

export interface EditorCompletionContext {
  key: string
  documentId: string
  documentVersion: number
  position: number
  blockStart: number
  contextChars: number
  beforeText: string
  afterText: string
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

  const beforeAll = parent.textBetween(0, $from.parentOffset, '\n', '\n')
  const afterAll = parent.textBetween($from.parentOffset, parent.content.size, '\n', '\n')
  if (!(beforeAll + afterAll).trim()) return null

  const { beforeText, afterText } = takeCaretContext(beforeAll, afterAll, options.maxChars)
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
    options.maxChars,
    sectionKind ?? '',
    beforeText,
    afterText,
  ].join('\u0000')

  return {
    key,
    documentId: options.documentId,
    documentVersion: options.documentVersion,
    position: selection.from,
    blockStart,
    contextChars: options.maxChars,
    beforeText,
    afterText,
    sectionKind,
  }
}

function takeCaretContext(
  beforeAll: string,
  afterAll: string,
  maxChars: number,
): { beforeText: string; afterText: string } {
  if (!afterAll) return { beforeText: beforeAll.slice(-maxChars), afterText: '' }
  if (!beforeAll) return { beforeText: '', afterText: afterAll.slice(0, maxChars) }

  const beforeTarget = Math.ceil(maxChars * 0.65)
  const afterTarget = maxChars - beforeTarget
  let beforeText = beforeAll.slice(-beforeTarget)
  let afterText = afterAll.slice(0, afterTarget)
  let remaining = maxChars - beforeText.length - afterText.length

  if (remaining > 0 && beforeText.length < beforeAll.length) {
    const extra = beforeAll.slice(-Math.min(beforeAll.length, beforeText.length + remaining))
    remaining -= extra.length - beforeText.length
    beforeText = extra
  }
  if (remaining > 0 && afterText.length < afterAll.length) {
    afterText = afterAll.slice(0, afterText.length + remaining)
  }

  return { beforeText, afterText }
}
