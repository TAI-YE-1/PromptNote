import type { PromptDocument, PromptNodeJSON } from '../prompt/schema'
import { isSectionKind, type SectionKind } from '../prompt/sectionKinds'
import { textOfPromptNode } from '../prompt/text'
import type { PromptLintFinding } from './types'

const vagueWords = ['尽量', '适当', '处理一下'] as const
const contextualReferences = ['这个文件', '该文件', '上面的逻辑', '上述代码', '前面的代码'] as const
const concreteReferencePattern = /(?:https?:\/\/|[\w./\\-]+\.(?:ts|tsx|js|jsx|json|md|py|sql|ya?ml)\b)/i

function sectionKindOf(block: PromptNodeJSON): SectionKind | null {
  if (block.type !== 'promptSection') return null
  const kind = block.attrs?.kind
  return isSectionKind(kind) ? kind : null
}

function normalizedBlockText(block: PromptNodeJSON): string {
  return textOfPromptNode(block).replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

export function lintPrompt(document: PromptDocument): PromptLintFinding[] {
  const blocks = document.content.content ?? []
  const allText = blocks.map(textOfPromptNode).join('\n')
  const findings: PromptLintFinding[] = []
  const sectionKinds = new Set(blocks.map(sectionKindOf).filter((kind): kind is SectionKind => kind !== null))
  const structuredBlocks = sectionKinds.size

  const vague = vagueWords.find((word) => allText.includes(word))
  if (vague) {
    findings.push({
      id: `vague:${vague}`,
      severity: 'warning',
      message: `“${vague}”表达比较模糊`,
      detail: '可以改成明确、可验证的动作或约束。',
      source: 'local',
    })
  }

  if (allText.trim().length > 120 && structuredBlocks > 0 && !sectionKinds.has('goal')) {
    findings.push({
      id: 'missing:goal',
      severity: 'warning',
      message: '较长任务没有明确目标',
      detail: '可以补充最终希望 AI 完成什么；短 Prompt 不强制要求目标块。',
      source: 'local',
    })
  }

  if (allText.trim().length > 120 && !sectionKinds.has('acceptance')) {
    findings.push({
      id: 'missing:acceptance',
      severity: 'warning',
      message: '当前没有明确验收标准',
      detail: '较长任务建议说明“什么情况下算完成”。',
      source: 'local',
    })
  }

  const seen = new Set<string>()
  const duplicate = blocks
    .map(normalizedBlockText)
    .filter((text) => text.length >= 12)
    .find((text) => {
      if (seen.has(text)) return true
      seen.add(text)
      return false
    })
  if (duplicate) {
    findings.push({
      id: 'duplicate:block',
      severity: 'info',
      message: '发现明显重复的内容块',
      detail: '完全相同的较长段落可能是误粘贴；如果是有意重复可以忽略。',
      source: 'local',
    })
  }

  const contextualReference = contextualReferences.find((term) => allText.includes(term))
  const hasConcreteReference = concreteReferencePattern.test(allText)
    || blocks.some((block) => block.type === 'codeBlock')
  if (contextualReference && !hasConcreteReference) {
    findings.push({
      id: `reference:${contextualReference}`,
      severity: 'info',
      message: `“${contextualReference}”可能缺少可定位的上下文`,
      detail: '如果它指向文件、代码或链接，建议把具体引用一起放进 Prompt。',
      source: 'local',
    })
  }

  if (allText.length > 500 && structuredBlocks === 0) {
    findings.push({
      id: 'structure:long-unstructured',
      severity: 'info',
      message: '内容较长但没有结构块',
      detail: '可以逐步增加目标、背景、约束或验收标准；不是强制要求。',
      source: 'local',
    })
  }

  return findings
}
