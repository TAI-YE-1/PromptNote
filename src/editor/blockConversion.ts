import type { EditorState, Transaction } from '@tiptap/pm/state'
import { isSectionKind, type SectionKind } from '../prompt/sectionKinds'

export type EditableBlockFormat = 'paragraph' | SectionKind

export interface ActiveBlockFormat {
  type: 'paragraph' | 'promptSection'
  format: EditableBlockFormat
}

export function getActiveBlockFormat(state: EditorState): ActiveBlockFormat | null {
  const { $from } = state.selection
  if ($from.depth !== 1) return null

  const node = $from.parent
  if (node.type.name === 'paragraph') {
    return { type: 'paragraph', format: 'paragraph' }
  }

  if (node.type.name === 'promptSection') {
    const kind = node.attrs.kind
    if (!isSectionKind(kind)) return null
    return { type: 'promptSection', format: kind }
  }

  return null
}

export function createBlockConversionTransaction(
  state: EditorState,
  format: EditableBlockFormat,
): Transaction | null {
  const active = getActiveBlockFormat(state)
  if (!active || active.format === format) return null

  const { $from } = state.selection
  const position = $from.before(1)

  if (format === 'paragraph') {
    const paragraph = state.schema.nodes.paragraph
    if (!paragraph) return null
    return state.tr.setNodeMarkup(position, paragraph)
  }

  const promptSection = state.schema.nodes.promptSection
  if (!promptSection) return null
  return state.tr.setNodeMarkup(position, promptSection, { kind: format })
}
