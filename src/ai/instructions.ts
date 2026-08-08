import type { AiAction, AiSettings } from './types'

export const AI_ACTION_INSTRUCTIONS: Record<AiAction, string> = {
  clarify: '把选中文字改得更明确、可执行。',
  shorten: '在不丢失约束和事实的前提下缩短选中文字。',
  split_constraints: '把选中文字拆成清晰、可执行的约束条目。',
  draft_acceptance: '根据给定 Prompt 生成简洁、可验证的验收标准。',
  ambiguity: '指出并改写最重要的一处歧义；只返回建议文本。',
  structure: '只给出结构整理建议，不整篇重写。',
  complete:
    '只补全用户当前正在编辑的文本块。输入用“<光标>”明确标出插入位置，光标前后文字都属于同一文本块；当前模块只用于理解语义，不要输出模块标签。必须返回一段可直接插在 <光标> 处、并能与前后文自然衔接的有用续写，通常约 10–60 个中文字符，除非更短才能避免重复。不要返回空内容，不要重复光标前文字，也不要重复光标后已经存在的文字；不加解释、标题、引号或 Markdown 围栏。',
}

export const AI_COMMON_INSTRUCTION =
  '你是 PromptNote 的局部 Prompt 辅助器。保持用户原意，不扩写无关内容，不改变事实，不接管整篇 Prompt。只返回建议正文，不要解释你的过程。'

export function resolveActionInstruction(settings: AiSettings, action: AiAction): string {
  const override = settings.instructionOverrides[action]?.trim()
  return override || AI_ACTION_INSTRUCTIONS[action]
}

export function buildSystemInstruction(settings: AiSettings, action: AiAction): string {
  return `${AI_COMMON_INSTRUCTION}\n${resolveActionInstruction(settings, action)}`
}
