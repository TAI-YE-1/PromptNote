import { describe, expect, it } from 'vitest'
import { promptSectionDomAttributes } from '../src/editor/promptSection'
import { sectionKindMeta, sectionKinds } from '../src/prompt/sectionKinds'

describe('promptSection DOM attributes', () => {
  it.each(sectionKinds)('keeps %s instead of falling back to context', (kind) => {
    expect(promptSectionDomAttributes(kind)).toEqual({
      'data-prompt-section': 'true',
      'data-kind': kind,
      'data-label': sectionKindMeta[kind].label,
    })
  })

  it('fails closed to context for an unknown kind', () => {
    expect(promptSectionDomAttributes('unknown')).toEqual({
      'data-prompt-section': 'true',
      'data-kind': 'context',
      'data-label': '背景',
    })
  })
})
