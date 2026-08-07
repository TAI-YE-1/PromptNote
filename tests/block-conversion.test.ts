import { getSchema } from '@tiptap/core'
import { TextSelection, EditorState } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import {
  createBlockConversionTransaction,
  getActiveBlockFormat,
} from '../src/editor/blockConversion'
import { PromptSection } from '../src/editor/promptSection'

const schema = getSchema([StarterKit, PromptSection])

function stateWith(nodeType: 'paragraph' | 'promptSection', text: string, kind = 'context') {
  const node = nodeType === 'paragraph'
    ? schema.nodes.paragraph.create(null, schema.text(text))
    : schema.nodes.promptSection.create({ kind }, schema.text(text))
  const doc = schema.nodes.doc.create(null, [node])
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, 1, Math.max(1, text.length)),
  })
}

describe('block conversion', () => {
  it('converts a paragraph to a semantic section without losing text', () => {
    const state = stateWith('paragraph', '只修改直接相关代码')
    const transaction = createBlockConversionTransaction(state, 'constraint')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.firstChild?.type.name).toBe('promptSection')
    expect(next.doc.firstChild?.attrs.kind).toBe('constraint')
    expect(next.doc.firstChild?.textContent).toBe('只修改直接相关代码')
  })

  it('converts a semantic section back to a paragraph without losing text', () => {
    const state = stateWith('promptSection', '这是背景信息', 'context')
    const transaction = createBlockConversionTransaction(state, 'paragraph')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.firstChild?.type.name).toBe('paragraph')
    expect(next.doc.firstChild?.textContent).toBe('这是背景信息')
  })

  it('reports the current semantic kind for the picker', () => {
    const state = stateWith('promptSection', '最终输出一个表格', 'output_format')
    expect(getActiveBlockFormat(state)).toEqual({
      type: 'promptSection',
      format: 'output_format',
    })
  })
})
