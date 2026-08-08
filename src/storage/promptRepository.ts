import { createPromptDocument, parsePromptDocument, type PromptDocument } from '../prompt/schema'

const DOCUMENTS_KEY = 'promptnote.documents.v1'
const CURRENT_DOCUMENT_KEY = 'promptnote.currentDocumentId.v1'

export interface PromptRepository {
  list(): Promise<PromptDocument[]>
  get(id: string): Promise<PromptDocument | null>
  save(document: PromptDocument): Promise<void>
  remove(id: string): Promise<void>
  getCurrentId(): Promise<string | null>
  setCurrentId(id: string): Promise<void>
  ensureCurrent(): Promise<PromptDocument>
}

type StoredDocuments = Record<string, PromptDocument>

export class ChromePromptRepository implements PromptRepository {
  private writeQueue: Promise<void> = Promise.resolve()

  private enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(operation, operation)
    this.writeQueue = next.catch(() => undefined)
    return next
  }

  private async readDocuments(): Promise<StoredDocuments> {
    const result = await chrome.storage.local.get(DOCUMENTS_KEY)
    return parseStoredDocuments(result[DOCUMENTS_KEY])
  }

  async list(): Promise<PromptDocument[]> {
    return sortDocuments(Object.values(await this.readDocuments()))
  }

  async get(id: string): Promise<PromptDocument | null> {
    const documents = await this.readDocuments()
    return documents[id] ?? null
  }

  async save(document: PromptDocument): Promise<void> {
    parsePromptDocument(document)
    await this.enqueueWrite(async () => {
      const documents = await this.readDocuments()
      const stored = documents[document.id]
      if (stored && stored.revision > document.revision) return
      documents[document.id] = document
      await chrome.storage.local.set({ [DOCUMENTS_KEY]: documents })
    })
  }

  async remove(id: string): Promise<void> {
    await this.enqueueWrite(async () => {
      const documents = await this.readDocuments()
      delete documents[id]
      await chrome.storage.local.set({ [DOCUMENTS_KEY]: documents })
    })
  }

  async getCurrentId(): Promise<string | null> {
    const result = await chrome.storage.local.get(CURRENT_DOCUMENT_KEY)
    return parseCurrentId(result[CURRENT_DOCUMENT_KEY])
  }

  async setCurrentId(id: string): Promise<void> {
    await chrome.storage.local.set({ [CURRENT_DOCUMENT_KEY]: id })
  }

  async ensureCurrent(): Promise<PromptDocument> {
    const result = await chrome.storage.local.get([DOCUMENTS_KEY, CURRENT_DOCUMENT_KEY])
    const documents = parseStoredDocuments(result[DOCUMENTS_KEY])
    const currentId = parseCurrentId(result[CURRENT_DOCUMENT_KEY])
    if (currentId && documents[currentId]) return documents[currentId]

    const existing = sortDocuments(Object.values(documents))[0]
    if (existing) {
      await this.setCurrentId(existing.id)
      return existing
    }

    const created = createPromptDocument()
    await this.enqueueWrite(async () => {
      await chrome.storage.local.set({
        [DOCUMENTS_KEY]: { [created.id]: created },
        [CURRENT_DOCUMENT_KEY]: created.id,
      })
    })
    return created
  }
}

function parseStoredDocuments(raw: unknown): StoredDocuments {
  if (!raw) return {}
  if (typeof raw !== 'object') throw new Error('本地 Prompt 数据格式损坏。')
  const parsed: StoredDocuments = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    parsed[id] = parsePromptDocument(value)
  }
  return parsed
}

function parseCurrentId(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function sortDocuments(documents: PromptDocument[]): PromptDocument[] {
  return documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
