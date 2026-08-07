import { describe, expect, it } from 'vitest'
import { compilePrompt } from '../src/prompt/compiler'
import type { PromptDocument, PromptNodeJSON } from '../src/prompt/schema'

function makeDocument(content: PromptNodeJSON[]): PromptDocument {
  return {
    id: 'test',
    title: 'test',
    schemaVersion: 1,
    revision: 1,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    content: { type: 'doc', content },
  }
}

const document = makeDocument([
  { type: 'promptSection', attrs: { kind: 'goal' }, content: [{ type: 'text', text: '修复权限问题' }] },
  { type: 'promptSection', attrs: { kind: 'constraint' }, content: [{ type: 'text', text: '不要扩大范围' }] },
])

describe('compilePrompt', () => {
  it('compiles plain text from one canonical document', () => {
    expect(compilePrompt(document, 'plain')).toBe('目标\n修复权限问题\n\n约束\n不要扩大范围')
  })

  it('compiles markdown without mutating the document', () => {
    const before = JSON.stringify(document)
    expect(compilePrompt(document, 'markdown')).toContain('## 目标')
    expect(JSON.stringify(document)).toBe(before)
  })

  it('escapes every XML-sensitive character', () => {
    const withXml = makeDocument([
      { type: 'paragraph', content: [{ type: 'text', text: `a < b & c > d "quoted" 'single'` }] },
    ])
    expect(compilePrompt(withXml, 'xml')).toContain(
      'a &lt; b &amp; c &gt; d &quot;quoted&quot; &apos;single&apos;',
    )
  })

  it('omits empty blocks without leaving empty headings or tags', () => {
    const withEmpty = makeDocument([
      { type: 'promptSection', attrs: { kind: 'goal' }, content: [] },
      { type: 'paragraph', content: [] },
      { type: 'promptSection', attrs: { kind: 'constraint' }, content: [{ type: 'text', text: '只改相关代码' }] },
    ])

    expect(compilePrompt(withEmpty, 'plain')).toBe('约束\n只改相关代码')
    expect(compilePrompt(withEmpty, 'markdown')).toBe('## 约束\n\n只改相关代码')
    expect(compilePrompt(withEmpty, 'xml')).toBe('<prompt>\n  <constraint>只改相关代码</constraint>\n</prompt>')
  })

  it('preserves nested list structure and hard breaks as readable text', () => {
    const nested = makeDocument([
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第一项' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二项' }] }] },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '第一行' },
          { type: 'hardBreak' },
          { type: 'text', text: '第二行' },
        ],
      },
    ])

    expect(compilePrompt(nested, 'plain')).toBe('- 第一项\n- 第二项\n\n第一行\n第二行')
  })

  it('keeps markdown/plain special characters literal and fences code blocks only in markdown', () => {
    const special = makeDocument([
      { type: 'paragraph', content: [{ type: 'text', text: '*literal* # heading? `inline`' }] },
      { type: 'codeBlock', content: [{ type: 'text', text: 'if (a < b) return c & d' }] },
    ])

    expect(compilePrompt(special, 'plain')).toBe('*literal* # heading? `inline`\n\nif (a < b) return c & d')
    expect(compilePrompt(special, 'markdown')).toBe(
      '*literal* # heading? `inline`\n\n```\nif (a < b) return c & d\n```',
    )
  })
})
