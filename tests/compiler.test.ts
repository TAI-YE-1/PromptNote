import { describe, expect, it } from 'vitest'
import { compilePrompt } from '../src/prompt/compiler'
import type { PromptDocument } from '../src/prompt/schema'

const document: PromptDocument = {
  id: 'test',
  title: 'test',
  schemaVersion: 1,
  revision: 1,
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
  content: {
    type: 'doc',
    content: [
      { type: 'promptSection', attrs: { kind: 'goal' }, content: [{ type: 'text', text: '修复权限问题' }] },
      { type: 'promptSection', attrs: { kind: 'constraint' }, content: [{ type: 'text', text: '不要扩大范围' }] },
    ],
  },
}

describe('compilePrompt', () => {
  it('compiles plain text from one canonical document', () => {
    expect(compilePrompt(document, 'plain')).toBe('目标\n修复权限问题\n\n约束\n不要扩大范围')
  })

  it('compiles markdown without mutating the document', () => {
    const before = JSON.stringify(document)
    expect(compilePrompt(document, 'markdown')).toContain('## 目标')
    expect(JSON.stringify(document)).toBe(before)
  })

  it('escapes XML content', () => {
    const withXml = structuredClone(document)
    withXml.content.content![0].content![0].text = 'a < b & c'
    expect(compilePrompt(withXml, 'xml')).toContain('a &lt; b &amp; c')
  })
})
