import type { EditorState } from '@tiptap/pm/state'
import { getActiveBlockFormat, type EditableBlockFormat } from './blockConversion'

export interface EditorSelectionSnapshot {
  text: string
  from: number
  to: number
  blockFormat: EditableBlockFormat
  rect: {
    left: number
    top: number
    width: number
    height: number
    containerWidth: number
  }
}

interface PositionCoords {
  left: number
  right: number
  top: number
  bottom: number
}

export function buildEditorSelectionSnapshot(
  state: EditorState,
  coordsAtPos: (position: number) => PositionCoords,
  containerWidth: number,
): EditorSelectionSnapshot | null {
  const { selection } = state
  if (selection.empty) return null

  const activeBlock = getActiveBlockFormat(state)
  if (!activeBlock) return null

  const anchor = coordsAtPos(selection.to)
  return {
    text: state.doc.textBetween(selection.from, selection.to, '\n'),
    from: selection.from,
    to: selection.to,
    blockFormat: activeBlock.format,
    rect: {
      left: anchor.right,
      top: anchor.top,
      width: 0,
      height: Math.max(18, anchor.bottom - anchor.top),
      containerWidth,
    },
  }
}
