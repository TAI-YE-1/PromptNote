import type { SectionKind } from '../prompt/sectionKinds'
import type { PromptSuggestion, SuggestionAiAction } from './types'

const labels: Record<SuggestionAiAction, string> = {
  clarify: '改清楚',
  shorten: '缩短',
  split_constraints: '拆成约束',
  draft_acceptance: '生成验收标准',
  ambiguity: '检查歧义',
  structure: '结构建议',
}

export function makeReplacementSuggestion(input: {
  action: SuggestionAiAction
  sourceText: string
  replacementText: string
  sourceRevision: number
  range?: { from: number; to: number }
}): PromptSuggestion {
  return {
    id: crypto.randomUUID(),
    action: input.action,
    label: labels[input.action],
    sourceText: input.sourceText,
    replacementText: input.replacementText,
    sourceRevision: input.sourceRevision,
    target: 'selection',
    range: input.range,
  }
}

export function makeAppendSuggestion(input: {
  action: SuggestionAiAction
  replacementText: string
  sourceRevision: number
  sectionKind?: SectionKind
}): PromptSuggestion {
  return {
    id: crypto.randomUUID(),
    action: input.action,
    label: labels[input.action],
    sourceText: '',
    replacementText: input.replacementText,
    sourceRevision: input.sourceRevision,
    target: input.sectionKind === 'acceptance' ? 'append-section' : 'advisory',
    sectionKind: input.sectionKind === 'acceptance' ? 'acceptance' : undefined,
  }
}

export function isSuggestionCurrent(suggestion: PromptSuggestion, currentRevision: number): boolean {
  return suggestion.sourceRevision === currentRevision
}
