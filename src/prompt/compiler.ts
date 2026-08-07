import type { PromptDocument, PromptNodeJSON } from './schema'
import { isSectionKind, sectionKindMeta } from './sectionKinds'
import { textOfPromptNode } from './text'

export type CompileFormat = 'plain' | 'markdown' | 'xml'

function blocksOf(document: PromptDocument): PromptNodeJSON[] {
  return document.content.content ?? []
}

function sectionKind(node: PromptNodeJSON) {
  const kind = node.attrs?.kind
  return isSectionKind(kind) ? kind : null
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function tagName(kind: string): string {
  return kind.replaceAll('_', '-')
}

export function compilePrompt(document: PromptDocument, format: CompileFormat): string {
  const blocks = blocksOf(document)
  if (format === 'plain') {
    return blocks
      .map((block) => {
        const kind = sectionKind(block)
        const text = textOfPromptNode(block).trim()
        if (!text) return ''
        return kind ? `${sectionKindMeta[kind].label}\n${text}` : text
      })
      .filter(Boolean)
      .join('\n\n')
  }

  if (format === 'markdown') {
    return blocks
      .map((block) => {
        const kind = sectionKind(block)
        const text = textOfPromptNode(block).trim()
        if (!text) return ''
        if (kind) return `## ${sectionKindMeta[kind].label}\n\n${text}`
        if (block.type === 'codeBlock') return `\`\`\`\n${text}\n\`\`\``
        return text
      })
      .filter(Boolean)
      .join('\n\n')
  }

  const xmlBlocks = blocks
    .map((block) => {
      const kind = sectionKind(block)
      const text = textOfPromptNode(block).trim()
      if (!text) return ''
      const tag = kind ? tagName(kind) : 'paragraph'
      return `  <${tag}>${escapeXml(text)}</${tag}>`
    })
    .filter(Boolean)
    .join('\n')

  return `<prompt>\n${xmlBlocks}\n</prompt>`
}
