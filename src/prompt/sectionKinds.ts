export const sectionKinds = [
  'goal',
  'context',
  'instruction',
  'constraint',
  'example',
  'output_format',
  'acceptance',
] as const

export type SectionKind = (typeof sectionKinds)[number]

export interface SectionKindMeta {
  kind: SectionKind
  label: string
  description: string
  icon: string
}

export const sectionKindMeta: Record<SectionKind, SectionKindMeta> = {
  goal: { kind: 'goal', label: '目标', description: '最终希望 AI 完成什么', icon: '◎' },
  context: { kind: 'context', label: '背景', description: '必要上下文与当前状态', icon: '▣' },
  instruction: { kind: 'instruction', label: '任务', description: '需要执行的具体动作', icon: '→' },
  constraint: { kind: 'constraint', label: '约束', description: '必须遵守或不能做的事', icon: '⛓' },
  example: { kind: 'example', label: '示例', description: '输入、输出或参考样例', icon: '◇' },
  output_format: { kind: 'output_format', label: '输出格式', description: '希望结果如何呈现', icon: '↳' },
  acceptance: { kind: 'acceptance', label: '验收标准', description: '什么情况下算完成', icon: '✓' },
}

export function isSectionKind(value: unknown): value is SectionKind {
  return typeof value === 'string' && sectionKinds.includes(value as SectionKind)
}
