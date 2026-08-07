import { describe, expect, it } from 'vitest'
import {
  isSuggestionCurrent,
  makeAppendSuggestion,
  makeReplacementSuggestion,
} from '../src/ai/suggestions'

describe('AI suggestion contract', () => {
  it('keeps the source revision on replacement suggestions', () => {
    const suggestion = makeReplacementSuggestion({
      action: 'clarify',
      sourceText: '尽量改好',
      replacementText: '仅修改相关代码。',
      sourceRevision: 7,
      range: { from: 2, to: 6 },
    })
    expect(suggestion.sourceRevision).toBe(7)
    expect(suggestion.target).toBe('selection')
    expect(isSuggestionCurrent(suggestion, 7)).toBe(true)
    expect(isSuggestionCurrent(suggestion, 8)).toBe(false)
  })

  it('models acceptance criteria as an append-only section suggestion', () => {
    const suggestion = makeAppendSuggestion({
      action: 'draft_acceptance',
      replacementText: '测试通过。',
      sourceRevision: 2,
      sectionKind: 'acceptance',
    })
    expect(suggestion.target).toBe('append-section')
    expect(suggestion.sectionKind).toBe('acceptance')
  })
})
