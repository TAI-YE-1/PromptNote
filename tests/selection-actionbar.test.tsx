import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SelectionActionBar } from '../src/ui/SelectionActionBar'
import type { EditorSelectionSnapshot } from '../src/editor/selectionSnapshot'

type ElementProps = { children?: ReactNode; disabled?: boolean; onClick?: () => void }
type ButtonElement = ReactElement<ElementProps, 'button'>

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!isValidElement<ElementProps>(node)) return ''
  return Children.toArray(node.props.children).map(nodeText).join('')
}

function findButton(node: ReactNode, label: string): ButtonElement | null {
  if (!isValidElement<ElementProps>(node)) return null
  if (node.type === 'button' && nodeText(node).trim() === label) return node as ButtonElement
  for (const child of Children.toArray(node.props.children)) {
    const found = findButton(child, label)
    if (found) return found
  }
  return null
}

function findSelect(node: ReactNode): ReactElement<ElementProps, 'select'> | null {
  if (!isValidElement<ElementProps>(node)) return null
  if (node.type === 'select') return node as ReactElement<ElementProps, 'select'>
  for (const child of Children.toArray(node.props.children)) {
    const found = findSelect(child)
    if (found) return found
  }
  return null
}

function selection(blockFormat: EditorSelectionSnapshot['blockFormat']): EditorSelectionSnapshot {
  return { text: '需要改清楚的内容', from: 3, to: 11, blockFormat }
}

describe('SelectionActionBar', () => {
  it('exposes direct selection actions without a secondary three-dot trigger', () => {
    const onAction = vi.fn()
    const onMore = vi.fn()
    const bar = SelectionActionBar({
      selection: selection('instruction'),
      onAction,
      onMore,
      onConvert: vi.fn(),
    })

    expect(nodeText(bar)).toContain('已选 8 字')
    expect(nodeText(bar)).not.toContain('•••')
    findButton(bar, '改清楚')?.props.onClick?.()
    findButton(bar, '缩短')?.props.onClick?.()
    findButton(bar, '拆约束')?.props.onClick?.()
    findButton(bar, '更多 AI')?.props.onClick?.()

    expect(onAction.mock.calls.map((call) => call[0])).toEqual(['clarify', 'shorten', 'split_constraints'])
    expect(onMore).toHaveBeenCalledOnce()
  })

  it('disables block-type conversion for a cross-block selection', () => {
    const bar = SelectionActionBar({
      selection: selection(null),
      onAction: vi.fn(),
      onMore: vi.fn(),
      onConvert: vi.fn(),
    })

    expect(findSelect(bar)?.props.disabled).toBe(true)
    expect(nodeText(bar)).toContain('跨块选区')
  })
})
