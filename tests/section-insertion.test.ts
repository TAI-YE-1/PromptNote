import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import {
  createAppendSectionTransaction,
  createSlashSectionTransaction,
} from '../src/editor/sectionInsertion'
import { PromptSection } from '../src/editor/promptSection'

const schema = getSchema([StarterKit, PromptSection])

function topLevelParagraphState(text: string, position: number) {
  const paragraph = schema.nodes.paragraph.create(
    null,
    text ? schema.text(text) : undefined,
  )
  const doc = schema.nodes.doc.create(null, [paragraph])
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, position),
  })
}

describe('section insertion transactions', () => {
  it('converts a top-level block in place at block start', () => {
    const state = topLevelParagraphState('现有正文', 1)
    const transaction = createSlashSectionTransaction(state, 'constraint')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.firstChild?.type.name).toBe('promptSection')
    expect(next.doc.firstChild?.attrs.kind).toBe('constraint')
    expect(next.doc.firstChild?.textContent).toBe('现有正文')
  })

  it('splits a text block before converting after whitespace', () => {
    const state = topLevelParagraphState('A ', 3)
    const transaction = createSlashSectionTransaction(state, 'context')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('paragraph')
    expect(next.doc.child(0).textContent).toBe('A ')
    expect(next.doc.child(1).type.name).toBe('promptSection')
    expect(next.doc.child(1).attrs.kind).toBe('context')
  })

  it('splits safely at a hard-break line start', () => {
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('A'),
      schema.nodes.hardBreak.create(),
      schema.text('B'),
    ])
    const doc = schema.nodes.doc.create(null, [paragraph])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 3),
    })
    const transaction = createSlashSectionTransaction(state, 'instruction')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('paragraph')
    expect(next.doc.child(1).type.name).toBe('promptSection')
    expect(next.doc.child(1).attrs.kind).toBe('instruction')
    expect(next.doc.child(1).textContent).toBe('B')
  })

  it('avoids inserting a block slice directly into a nested list paragraph', () => {
    const paragraph = schema.nodes.paragraph.create(null, schema.text('列表项'))
    const listItem = schema.nodes.listItem.create(null, [paragraph])
    const bulletList = schema.nodes.bulletList.create(null, [listItem])
    const doc = schema.nodes.doc.create(null, [bulletList])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 3),
    })
    const transaction = createSlashSectionTransaction(state, 'example')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    const nextItem = next.doc.firstChild?.firstChild
    expect(nextItem?.childCount).toBe(2)
    expect(nextItem?.child(0).type.name).toBe('paragraph')
    expect(nextItem?.child(1).type.name).toBe('promptSection')
    expect(nextItem?.child(1).attrs.kind).toBe('example')
    expect(nextItem?.child(1).textContent).toBe('列表项')
  })

  it('appends a semantic section at document depth instead of an inline caret', () => {
    const state = topLevelParagraphState('正文', 3)
    const transaction = createAppendSectionTransaction(state, 'acceptance', '验收通过')

    expect(transaction).not.toBeNull()
    const next = state.apply(transaction!)
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(1).type.name).toBe('promptSection')
    expect(next.doc.child(1).attrs.kind).toBe('acceptance')
    expect(next.doc.child(1).textContent).toBe('验收通过')
  })
})
