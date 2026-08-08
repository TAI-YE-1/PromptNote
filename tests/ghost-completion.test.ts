import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import type { DecorationSet, EditorView } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it, vi } from 'vitest'
import { PromptSection } from '../src/editor/promptSection'
import type { EditorCompletionSuggestion } from '../src/editor/completionContext'
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

function completion(view: EditorView, text: string, contextKey = 'context-1'): EditorCompletionSuggestion {
  return {
    text,
    contextKey,
    documentId: 'doc-1',
    position: view.state.selection.head,
  }
}

function showCompletion(view: EditorView, value: EditorCompletionSuggestion) {
  view.dispatch(view.state.tr.setMeta(ghostCompletionKey, value))
}

function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent
}

function runGhostKey(harness: ReturnType<typeof createHarness>, event: KeyboardEvent) {
  const handler = harness.plugin.props.handleKeyDown
  if (!handler) throw new Error('Ghost completion key handler is missing.')
  return handler.call(harness.plugin, harness.view, event)
}

function visibleDecorationKey(harness: ReturnType<typeof createHarness>): string | undefined {
  const source = harness.plugin.props.decorations?.call(harness.plugin, harness.state())
  const decorations = source as DecorationSet | null | undefined
  const first = decorations?.find()[0]
  return first?.spec.key as string | undefined
}

describe('ghost completion', () => {
  it('accepts the visible completion with Tab and makes it real document text', () => {
    const harness = createHarness('目标')
    showCompletion(harness.view, completion(harness.view, '：完成权限重构'))

    expect(getGhostCompletion(harness.state())?.text).toBe('：完成权限重构')
    const event = keyEvent('Tab')
    const handled = runGhostKey(harness, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(harness.state().doc.textContent).toBe('目标：完成权限重构')
    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })

  it('refreshes the decoration identity as streaming partial text grows', () => {
    const harness = createHarness('背景')
    showCompletion(harness.view, completion(harness.view, '请将'))
    const firstKey = visibleDecorationKey(harness)

    showCompletion(harness.view, completion(harness.view, '请将目标写得更明确'))
    const secondKey = visibleDecorationKey(harness)

    expect(getGhostCompletion(harness.state())?.text).toBe('请将目标写得更明确')
    expect(firstKey).toBeTruthy()
    expect(secondKey).toBeTruthy()
    expect(secondKey).not.toBe(firstKey)
  })

  it('preserves meaningful leading whitespace when accepting an English completion', () => {
    const harness = createHarness('hello')
    showCompletion(harness.view, completion(harness.view, ' world   '))

    expect(getGhostCompletion(harness.state())?.text).toBe(' world')
    runGhostKey(harness, keyEvent('Tab'))

    expect(harness.state().doc.textContent).toBe('hello world')
  })

  it('dismisses the completion with Escape without changing document text', () => {
    const harness = createHarness('背景')
    showCompletion(harness.view, completion(harness.view, '：只做当前任务'))

    const event = keyEvent('Escape')
    const handled = runGhostKey(harness, event)

    expect(handled).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(harness.state().doc.textContent).toBe('背景')
    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })

  it('invalidates stale completion as soon as the document changes', () => {
    const harness = createHarness('任务')
    showCompletion(harness.view, completion(harness.view, '：继续实现'))

    harness.view.dispatch(harness.view.state.tr.insertText('A'))

    expect(getGhostCompletion(harness.state())?.text).toBeNull()
  })

  it('rejects a streamed completion that belongs to an old caret position', () => {
    const harness = createHarness('任务内容')
    const oldCompletion = completion(harness.view, '旧请求结果', 'old-context')
    harness.view.dispatch(
      harness.view.state.tr.setSelection(TextSelection.create(harness.view.state.doc, 2)),
    )

    showCompletion(harness.view, oldCompletion)

    expect(getGhostCompletion(harness.state())?.text).toBeNull()
    expect(runGhostKey(harness, keyEvent('Tab'))).toBe(false)
    expect(harness.state().doc.textContent).toBe('任务内容')
  })

  it('does not accept a ghost after the caret moves away from its pinned position', () => {
    const harness = createHarness('背景内容')
    showCompletion(harness.view, completion(harness.view, '补全'))
    harness.view.dispatch(
      harness.view.state.tr.setSelection(TextSelection.create(harness.view.state.doc, 2)),
    )

    expect(getGhostCompletion(harness.state())?.text).toBeNull()
    expect(runGhostKey(harness, keyEvent('Tab'))).toBe(false)
  })
})
