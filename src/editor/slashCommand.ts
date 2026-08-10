import type { EditorState } from '@tiptap/pm/state'

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
