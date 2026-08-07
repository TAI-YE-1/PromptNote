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
    const raw = result[DOCUMENTS_KEY]
    if (!raw) return {}
    if (!raw || typeof raw !== 'object') throw new Error('本地 Prompt 数据格式损坏。')
    const parsed: StoredDocuments = {}
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      parsed[id] = parsePromptDocument(value)
    }
    return parsed
  }

  async list(): Promise<PromptDocument[]> {
    const documents = await this.readDocuments()
    return Object.values(documents).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<PromptDocument | null> {
    const documents = await this.readDocuments()
    return documents[id] ?? null
  }

  async save(document: PromptDocument): Promise<void> {
    parsePromptDocument(document)
    await this.enqueueWrite(async () => {
      const documents = await this.readDocuments()
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
    const value = result[CURRENT_DOCUMENT_KEY]
    return typeof value === 'string' ? value : null
  }

  async setCurrentId(id: string): Promise<void> {
    await chrome.storage.local.set({ [CURRENT_DOCUMENT_KEY]: id })
  }

  async ensureCurrent(): Promise<PromptDocument> {
    const currentId = await this.getCurrentId()
    if (currentId) {
      const existing = await this.get(currentId)
      if (existing) return existing
    }
    const documents = await this.list()
    if (documents[0]) {
      await this.setCurrentId(documents[0].id)
      return documents[0]
    }
    const created = createPromptDocument()
    await this.save(created)
    await this.setCurrentId(created.id)
    return created
  }
}
