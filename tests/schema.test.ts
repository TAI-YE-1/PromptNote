import { describe, expect, it } from 'vitest'
import {
  createPromptDocument,
  createPromptDocumentExport,
  parsePromptDocument,
  parsePromptDocumentExport,
} from '../src/prompt/schema'

describe('PromptDocument contract', () => {
  it('round-trips a new document', () => {
    const document = createPromptDocument('测试')
    expect(parsePromptDocument(structuredClone(document))).toEqual(document)
  })

  it('round-trips the JSON backup envelope', () => {
    const document = createPromptDocument('备份测试')
    const backup = createPromptDocumentExport(document)
    expect(parsePromptDocumentExport(JSON.parse(JSON.stringify(backup)))).toEqual(backup)
  })

  it('fails closed for a malformed backup envelope', () => {
    const document = createPromptDocument('备份测试')
    expect(() => parsePromptDocumentExport({ exportedAt: 123, document })).toThrow(/备份时间/)
  })

  it('fails closed for an unknown schema version', () => {
    const document = createPromptDocument('测试')
    expect(() => parsePromptDocument({ ...document, schemaVersion: 999 })).toThrow(/schemaVersion/)
  })

  it('fails closed for an unknown promptSection kind', () => {
    const document = createPromptDocument('测试')
    document.content = {
      type: 'doc',
      content: [{ type: 'promptSection', attrs: { kind: 'mystery' }, content: [] }],
    }
    expect(() => parsePromptDocument(document)).toThrow(/promptSection.kind/)
  })
})
