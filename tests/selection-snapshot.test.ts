import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
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
  it('derives selected text and block type only from ProseMirror state', () => {
    const state = stateWithSelection('你是一位结构化思考专家', 2, 7)

    const snapshot = buildEditorSelectionSnapshot(state)

    expect(snapshot).toEqual({
      text: '一位结构化',
      from: state.selection.from,
      to: state.selection.to,
      blockFormat: 'instruction',
    })
  })

  it('returns null for an empty caret selection so selection actions stay hidden', () => {
    const state = stateWithSelection('任务内容', 2, 2)
    expect(buildEditorSelectionSnapshot(state)).toBeNull()
  })
})
