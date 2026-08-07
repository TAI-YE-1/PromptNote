import { getSchema } from '@tiptap/core'
import { history, redo, undo } from '@tiptap/pm/history'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { createBlockConversionTransaction } from '../src/editor/blockConversion'
import { PromptSection } from '../src/editor/promptSection'

const schema = getSchema([StarterKit, PromptSection])

type HistoryCommand = (
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
) => boolean

function paragraphState(text: string) {
  const paragraph = schema.nodes.paragraph.create(null, schema.text(text))
  const doc = schema.nodes.doc.create(null, [paragraph])
  return EditorState.create({
    schema,
    doc,
    plugins: [history()],
    selection: TextSelection.create(doc, 1, text.length + 1),
  })
}

function runHistoryCommand(state: EditorState, command: HistoryCommand) {
  let next: EditorState | null = null
  expect(command(state, (transaction) => {
    next = state.apply(transaction)
  })).toBe(true)
  if (!next) throw new Error('History command did not dispatch a transaction.')
  return next
}

describe('editor undo/redo', () => {
  it('undoes and redoes paragraph to semantic-section conversion', () => {
    const initial = paragraphState('只修改直接相关代码')
    const conversion = createBlockConversionTransaction(initial, 'constraint')
    expect(conversion).not.toBeNull()

    const converted = initial.apply(conversion!)
    expect(converted.doc.firstChild?.type.name).toBe('promptSection')
    expect(converted.doc.firstChild?.attrs.kind).toBe('constraint')

    const undone = runHistoryCommand(converted, undo)
    expect(undone.doc.firstChild?.type.name).toBe('paragraph')
    expect(undone.doc.firstChild?.textContent).toBe('只修改直接相关代码')

    const redone = runHistoryCommand(undone, redo)
    expect(redone.doc.firstChild?.type.name).toBe('promptSection')
    expect(redone.doc.firstChild?.attrs.kind).toBe('constraint')
    expect(redone.doc.firstChild?.textContent).toBe('只修改直接相关代码')
  })

  it('undoes and redoes the text replacement used when accepting a selection suggestion', () => {
    const original = '尽量只处理这个问题'
    const replacement = '仅处理这个问题'
    const initial = paragraphState(original)

    const replaced = initial.apply(initial.tr.insertText(replacement, 1, original.length + 1))
    expect(replaced.doc.textContent).toBe(replacement)

    const undone = runHistoryCommand(replaced, undo)
    expect(undone.doc.textContent).toBe(original)

    const redone = runHistoryCommand(undone, redo)
    expect(redone.doc.textContent).toBe(replacement)
  })

  it('undoes and redoes an acceptance section appended by an accepted AI suggestion', () => {
    const initial = paragraphState('修复权限判断')
    const acceptance = schema.nodes.promptSection.create(
      { kind: 'acceptance' },
      schema.text('owner 可以正常管理角色'),
    )

    const appended = initial.apply(initial.tr.insert(initial.doc.content.size, acceptance))
    expect(appended.doc.childCount).toBe(2)
    expect(appended.doc.lastChild?.attrs.kind).toBe('acceptance')

    const undone = runHistoryCommand(appended, undo)
    expect(undone.doc.childCount).toBe(1)
    expect(undone.doc.textContent).toBe('修复权限判断')

    const redone = runHistoryCommand(undone, redo)
    expect(redone.doc.childCount).toBe(2)
    expect(redone.doc.lastChild?.attrs.kind).toBe('acceptance')
    expect(redone.doc.lastChild?.textContent).toBe('owner 可以正常管理角色')
  })
})
