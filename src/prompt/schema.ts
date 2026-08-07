import { isSectionKind, type SectionKind } from './sectionKinds'

export const PROMPT_SCHEMA_VERSION = 1 as const

export interface PromptNodeJSON {
  type?: string
  attrs?: Record<string, unknown>
  content?: PromptNodeJSON[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

export interface PromptDocument {
  id: string
  title: string
  schemaVersion: typeof PROMPT_SCHEMA_VERSION
  revision: number
  content: PromptNodeJSON
  createdAt: string
  updatedAt: string
}

export interface PromptDocumentExport {
  exportedAt: string
  document: PromptDocument
}

export function createPromptDocument(title = '未命名 Prompt'): PromptDocument {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title,
    schemaVersion: PROMPT_SCHEMA_VERSION,
    revision: 0,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    createdAt: now,
    updatedAt: now,
  }
}

function isNode(value: unknown): value is PromptNodeJSON {
  if (!value || typeof value !== 'object') return false
  const node = value as PromptNodeJSON
  if (node.text !== undefined && typeof node.text !== 'string') return false
  if (node.content !== undefined && (!Array.isArray(node.content) || !node.content.every(isNode))) return false
  return true
}

export function parsePromptDocument(value: unknown): PromptDocument {
  if (!value || typeof value !== 'object') throw new Error('PromptDocument 不是对象。')
  const doc = value as Partial<PromptDocument>
  if (doc.schemaVersion !== PROMPT_SCHEMA_VERSION) {
    throw new Error(`不支持的 PromptDocument schemaVersion：${String(doc.schemaVersion)}`)
  }
  if (!doc.id || typeof doc.id !== 'string') throw new Error('PromptDocument.id 无效。')
  if (typeof doc.title !== 'string') throw new Error('PromptDocument.title 无效。')
  if (!Number.isInteger(doc.revision) || (doc.revision ?? -1) < 0) {
    throw new Error('PromptDocument.revision 无效。')
  }
  if (!isNode(doc.content)) throw new Error('PromptDocument.content 无效。')
  if (typeof doc.createdAt !== 'string' || typeof doc.updatedAt !== 'string') {
    throw new Error('PromptDocument 时间字段无效。')
  }
  validateSectionKinds(doc.content)
  return doc as PromptDocument
}

function validateSectionKinds(node: PromptNodeJSON): void {
  if (node.type === 'promptSection') {
    const kind = node.attrs?.kind
    if (!isSectionKind(kind)) throw new Error(`未知 promptSection.kind：${String(kind)}`)
  }
  node.content?.forEach(validateSectionKinds)
}

export function cloneWithContent(
  document: PromptDocument,
  content: PromptNodeJSON,
  title = document.title,
): PromptDocument {
  return {
    ...document,
    title,
    content,
    revision: document.revision + 1,
    updatedAt: new Date().toISOString(),
  }
}

export function makeSectionNode(kind: SectionKind, text = ''): PromptNodeJSON {
  return {
    type: 'promptSection',
    attrs: { kind },
    content: text ? [{ type: 'text', text }] : [],
  }
}
