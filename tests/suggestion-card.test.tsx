import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { makeAppendSuggestion, makeReplacementSuggestion } from '../src/ai/suggestions'
import { SuggestionCard } from '../src/ui/components'

type ElementProps = {
  children?: ReactNode
}

type ButtonProps = ElementProps & {
  disabled?: boolean
  onClick?: () => void
}

type ButtonElement = ReactElement<ButtonProps, 'button'>

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!isValidElement<ElementProps>(node)) return ''
  return Children.toArray(node.props.children).map(nodeText).join('')
}

function findButton(node: ReactNode, label: string): ButtonElement | null {
  if (!isValidElement<ElementProps>(node)) return null
  if (node.type === 'button' && nodeText(node).trim() === label) return node as ButtonElement
  for (const child of Children.toArray(node.props.children)) {
    const match = findButton(child, label)
    if (match) return match
  }
  return null
}

describe('SuggestionCard', () => {
  it('wires explicit accept and ignore actions for an editable suggestion', () => {
    const onAccept = vi.fn()
    const onIgnore = vi.fn()
    const suggestion = makeReplacementSuggestion({
      action: 'clarify',
      sourceText: '尽量处理一下',
      replacementText: '仅处理与当前问题直接相关的内容。',
      sourceRevision: 3,
      range: { from: 1, to: 7 },
    })

    const card = SuggestionCard({ suggestion, stale: false, onAccept, onIgnore })
    const accept = findButton(card, '接受')
    const ignore = findButton(card, '忽略')

    expect(accept?.props.disabled).toBe(false)
    expect(ignore).not.toBeNull()

    accept?.props.onClick?.()
    ignore?.props.onClick?.()

    expect(onAccept).toHaveBeenCalledOnce()
    expect(onIgnore).toHaveBeenCalledOnce()
  })

  it('disables accepting a stale suggestion while keeping ignore available', () => {
    const suggestion = makeReplacementSuggestion({
      action: 'shorten',
      sourceText: '这是一段比较长的原文',
      replacementText: '精简原文',
      sourceRevision: 2,
      range: { from: 1, to: 10 },
    })

    const card = SuggestionCard({ suggestion, stale: true, onAccept: vi.fn(), onIgnore: vi.fn() })

    expect(nodeText(card)).toContain('正文已变化 · 建议已过期')
    expect(findButton(card, '接受')?.props.disabled).toBe(true)
    expect(findButton(card, '忽略')).not.toBeNull()
  })

  it('renders advisory suggestions as close-only so they cannot mutate the document', () => {
    const onIgnore = vi.fn()
    const suggestion = makeAppendSuggestion({
      action: 'structure',
      replacementText: '当前结构已经足够清楚，不建议增加更多结构块。',
      sourceRevision: 1,
    })

    const card = SuggestionCard({ suggestion, stale: false, onAccept: vi.fn(), onIgnore })
    const close = findButton(card, '关闭')

    expect(findButton(card, '接受')).toBeNull()
    expect(close).not.toBeNull()
    close?.props.onClick?.()
    expect(onIgnore).toHaveBeenCalledOnce()
  })
})
