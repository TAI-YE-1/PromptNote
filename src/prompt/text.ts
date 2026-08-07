import type { PromptNodeJSON } from './schema'

export function textOfPromptNode(node: PromptNodeJSON): string {
  if (node.text) return node.text
  if (node.type === 'hardBreak') return '\n'

  const parts = (node.content ?? []).map(textOfPromptNode).filter(Boolean)
  if (node.type === 'bulletList') return parts.join('\n')
  if (node.type === 'listItem') return `- ${parts.join(' ')}`
  return parts.join('')
}
