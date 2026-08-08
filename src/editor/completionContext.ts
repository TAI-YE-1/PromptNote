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

  const { beforeText, afterText } = readCaretContext(parent, $from.parentOffset, options.maxChars)
  if (!(beforeText + afterText).trim()) return null

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

function readCaretContext(
  parent: { content: { size: number }; textBetween(from: number, to: number, blockSeparator?: string, leafText?: string): string },
  parentOffset: number,
  maxChars: number,
): { beforeText: string; afterText: string } {
  // ProseMirror offsets and visible text length are identical for ordinary text nodes.
  // A small bounded overscan keeps hard-break/inline-node separators from starving the
  // configured text budget without ever materializing the whole existing block first.
  const scanBudget = Math.max(maxChars, Math.min(maxChars * 2, maxChars + 64))
  const beforeFrom = Math.max(0, parentOffset - scanBudget)
  const afterTo = Math.min(parent.content.size, parentOffset + scanBudget)
  const beforeAll = parent.textBetween(beforeFrom, parentOffset, '\n', '\n')
  const afterAll = parent.textBetween(parentOffset, afterTo, '\n', '\n')
  return takeCaretContext(beforeAll, afterAll, maxChars)
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
