import { describe, expect, it } from 'vitest'
import { createPromptDocument, parsePromptDocument } from '../src/prompt/schema'

describe('PromptDocument contract', () => {
  it('round-trips a new document', () => {
    const document = createPromptDocument('测试')
    expect(parsePromptDocument(structuredClone(document))).toEqual(document)
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
