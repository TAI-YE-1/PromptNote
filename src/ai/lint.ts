import type { PromptDocument, PromptNodeJSON } from '../prompt/schema'
import { isSectionKind } from '../prompt/sectionKinds'
import type { PromptLintFinding } from './types'

function textOf(node: PromptNodeJSON): string {
  if (node.text) return node.text
  return (node.content ?? []).map(textOf).join(node.type === 'paragraph' ? '' : '\n')
}

export function lintPrompt(document: PromptDocument): PromptLintFinding[] {
  const blocks = document.content.content ?? []
  const allText = blocks.map(textOf).join('\n')
  const findings: PromptLintFinding[] = []

  const vagueWords = ['尽量', '适当', '处理一下']
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

  const hasAcceptance = blocks.some(
    (block) => block.type === 'promptSection' && isSectionKind(block.attrs?.kind) && block.attrs?.kind === 'acceptance',
  )
  if (!hasAcceptance && allText.trim().length > 120) {
    findings.push({
      id: 'missing:acceptance',
      severity: 'warning',
      message: '当前没有明确验收标准',
      detail: '较长任务建议说明“什么情况下算完成”。',
      source: 'local',
    })
  }

  const structuredBlocks = blocks.filter((block) => block.type === 'promptSection').length
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
