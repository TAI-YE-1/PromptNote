import { describe, expect, it } from 'vitest'
import { lintPrompt } from '../src/ai/lint'
import type { PromptDocument } from '../src/prompt/schema'

function makeDocument(text: string): PromptDocument {
  return {
    id: 'test',
    title: 'test',
    schemaVersion: 1,
    revision: 0,
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  }
}

describe('lintPrompt', () => {
  it('flags vague words without scoring the prompt', () => {
    const findings = lintPrompt(makeDocument('尽量只处理这个问题。'))
    expect(findings.some((finding) => finding.id.startsWith('vague:'))).toBe(true)
  })

  it('stays deterministic and does not require AI', () => {
    expect(lintPrompt(makeDocument('明确完成这个任务。'))).toEqual([])
  })
})
