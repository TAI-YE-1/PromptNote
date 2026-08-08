import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it, vi } from 'vitest'
import { PromptSection } from '../src/editor/promptSection'
import { buildEditorSelectionSnapshot } from '../src/editor/selectionSnapshot'

const schema = getSchema([StarterKit, PromptSection])

function stateWithSelection(text: string, fromOffset: number, toOffset: number) {
  const section = schema.nodes.promptSection.create(
    { kind: 'instruction' },
    schema.text(text),
  )
  const doc = schema.nodes.doc.create(null, [section])
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, 1 + fromOffset, 1 + toOffset),
  })
}

describe('editor selection snapshot', () => {
  it('derives selected text and viewport anchor from ProseMirror state', () => {
    const state = stateWithSelection('你是一位结构化思考专家', 2, 7)
    const coordsAtPos = vi.fn(() => ({ left: 300, right: 306, top: 120, bottom: 138 }))

    const snapshot = buildEditorSelectionSnapshot(state, coordsAtPos, 480)

    expect(snapshot?.text).toBe('一位结构化')
    expect(snapshot?.blockFormat).toBe('instruction')
    expect(snapshot?.rect).toEqual({
      left: 306,
      top: 120,
      width: 0,
      height: 18,
      containerWidth: 480,
    })
    expect(coordsAtPos).toHaveBeenCalledWith(state.selection.to)
  })

  it('returns null for an empty caret selection so the text action trigger is hidden', () => {
    const state = stateWithSelection('任务内容', 2, 2)
    const coordsAtPos = vi.fn()

    expect(buildEditorSelectionSnapshot(state, coordsAtPos, 480)).toBeNull()
    expect(coordsAtPos).not.toHaveBeenCalled()
  })
})
