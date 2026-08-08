import type { PromptDocument } from '../prompt/schema'

interface ImportResolutionOptions {
  now?: () => string
  newId?: () => string
}

export function resolveImportedDocument(
  document: PromptDocument,
  existing: PromptDocument | null,
  overwrite: boolean,
  options: ImportResolutionOptions = {},
): PromptDocument {
  if (!existing) return document

  const now = (options.now ?? (() => new Date().toISOString()))()
  if (overwrite) {
    return {
      ...document,
      revision: Math.max(document.revision, existing.revision) + 1,
      updatedAt: now,
    }
  }

  return {
    ...document,
    id: (options.newId ?? crypto.randomUUID)(),
    title: `${document.title || '未命名 Prompt'}（导入）`,
    revision: document.revision + 1,
    updatedAt: now,
  }
}
