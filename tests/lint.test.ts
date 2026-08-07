import { describe, expect, it } from 'vitest'
import { lintPrompt } from '../src/ai/lint'
import type { PromptDocument, PromptNodeJSON } from '../src/prompt/schema'

function makeDocument(blocks: PromptNodeJSON[]): PromptDocument {
  return {
    id: 'test',
    title: 'test',
    schemaVersion: 1,
    revision: 0,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    content: { type: 'doc', content: blocks },
  }
}

function paragraph(text: string): PromptNodeJSON {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function section(kind: string, text: string): PromptNodeJSON {
  return { type: 'promptSection', attrs: { kind }, content: [{ type: 'text', text }] }
}

describe('lintPrompt', () => {
  it('flags vague words without scoring the prompt', () => {
    const findings = lintPrompt(makeDocument([paragraph('尽量只处理这个问题。')]))
    expect(findings.some((finding) => finding.id.startsWith('vague:'))).toBe(true)
  })

  it('stays deterministic and does not require AI', () => {
    expect(lintPrompt(makeDocument([paragraph('明确完成这个任务。')]))).toEqual([])
  })

  it('flags a long structured task when goal and acceptance are both missing', () => {
    const longContext = '当前系统已经存在一套权限逻辑，需要核对真实调用链、角色定义和现有行为后再修改。'.repeat(4)
    const findings = lintPrompt(makeDocument([section('context', longContext)]))
    const ids = findings.map((finding) => finding.id)

    expect(ids).toContain('missing:goal')
    expect(ids).toContain('missing:acceptance')
  })

  it('detects only obvious exact duplicate blocks', () => {
    const repeated = '仅修改与本问题直接相关的代码，不扩大修改范围。'
    const findings = lintPrompt(makeDocument([
      section('constraint', repeated),
      paragraph(repeated),
      paragraph('这是一段不同的说明。'),
    ]))

    expect(findings.some((finding) => finding.id === 'duplicate:block')).toBe(true)
  })

  it('warns about contextual references only when no concrete reference is present', () => {
    const unresolved = lintPrompt(makeDocument([paragraph('请修复这个文件里的权限判断。')]))
    expect(unresolved.some((finding) => finding.id === 'reference:这个文件')).toBe(true)

    const resolved = lintPrompt(makeDocument([paragraph('请修复这个文件 src/App.tsx 里的权限判断。')]))
    expect(resolved.some((finding) => finding.id === 'reference:这个文件')).toBe(false)
  })

  it('flags long unstructured content without requiring semantic blocks', () => {
    const findings = lintPrompt(makeDocument([paragraph('明确描述当前任务和限制。'.repeat(45))]))
    expect(findings.some((finding) => finding.id === 'structure:long-unstructured')).toBe(true)
  })
})
