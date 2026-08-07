import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it, vi } from 'vitest'
import { PromptSection } from '../src/editor/promptSection'
import {
  createGhostCompletionPlugin,
  getGhostCompletion,
  ghostCompletionKey,
} from '../src/editor/ghostCompletion'

const schema = getSchema([StarterKit, PromptSection])

function createHarness(text: string) {
  const plugin = createGhostCompletionPlugin()
  const paragraph = schema.nodes.paragraph.create(null, schema.text(text))
  const doc = schema.nodes.doc.create(null, [paragraph])
  let state = EditorState.create({
    schema,
    doc,
    plugins: [plugin],
    selection: TextSelection.atEnd(doc),
  })

  const view = {
    get state() {
      return state
    },
    dispatch(transaction: Transaction) {
      state = state.apply(transaction)
    },
  } as unknown as EditorView

  return { plugin, view, state: () => state }
}

function showCompletion(view: EditorView, text: string) {
  view.dispatch(view.state.tr.setMeta(ghostCompletionKey, { text }))
}

function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent
}

describe('ghost completion', () => {
  it('accepts the visible completion with Tab and makes it real document text', () => {
    const harness = createHarness('目标')
    showCompletion(harness.view, '：完成权限重构')

    expect(getGhostCompletion(harness.state())?.text).toBe('：完成权限重构')
    const event = keyEvent('Tab')
    const handled = harness.plugin.props.handleKeyDown?.(harness.view, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(harness.state().doc.textContent).toBe('目标：完成权限重构')
    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })

  it('dismisses the completion with Escape without changing document text', () => {
    const harness = createHarness('背景')
    showCompletion(harness.view, '：只做当前任务')

    const event = keyEvent('Escape')
    const handled = harness.plugin.props.handleKeyDown?.(harness.view, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(harness.state().doc.textContent).toBe('背景')
    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })

  it('invalidates stale completion as soon as the document changes', () => {
    const harness = createHarness('任务')
    showCompletion(harness.view, '：继续实现')

    harness.view.dispatch(harness.view.state.tr.insertText('A'))

    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })
})
