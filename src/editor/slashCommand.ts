import type { EditorState } from '@tiptap/pm/state'

export interface SlashMenuAnchor {
  left: number
  top: number
  bottom: number
}

export type SlashMenuKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End' | 'Enter' | 'Escape'

const slashMenuKeys = new Set<string>([
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
  'Enter',
  'Escape',
])

export function isSlashMenuKey(key: string): key is SlashMenuKey {
  return slashMenuKeys.has(key)
}

export function nextSlashMenuIndex(currentIndex: number, key: string, itemCount: number): number {
  if (itemCount <= 0) return -1
  if (key === 'ArrowDown') return (currentIndex + 1) % itemCount
  if (key === 'ArrowUp') return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  return currentIndex
}

export function shouldOpenSlashMenu(state: EditorState): boolean {
  const { selection } = state
  if (!selection.empty) return false

  const { $from } = selection
  if (!$from.parent.isTextblock) return false
  if ($from.parentOffset === 0) return true

  const previousNode = $from.nodeBefore
  if (previousNode?.type.name === 'hardBreak') return true
  if (!previousNode?.isText) return false

  return /\s$/u.test(previousNode.text ?? '')
}
