import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import { buildEditorCompletionContext } from '../src/editor/completionContext'
import { PromptSection } from '../src/editor/promptSection'

const schema = getSchema([StarterKit, PromptSection])

function promptSection(kind: string, text: string) {
  return schema.nodes.promptSection.create({ kind }, text ? schema.text(text) : undefined)
}

function stateWithCaretInSecondBlock(firstText: string, secondText: string) {
  const first = promptSection('output_format', firstText)
  const second = promptSection('context', secondText)
  const doc = schema.nodes.doc.create(null, [first, second])
  const secondContentStart = first.nodeSize + 1
  const caret = secondContentStart + second.content.size
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, caret),
  })
}

describe('editor completion context', () => {
  it('uses only the active semantic block and never leaks previous block text', () => {
    const state = stateWithCaretInSecondBlock(
      '你是一位擅长结构化思考的专家，请改写下面内容。',
      '你是',
    )

    const context = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 7,
      maxChars: 320,
    })

    expect(context?.beforeText).toBe('你是')
    expect(context?.sectionKind).toBe('context')
    expect(context?.beforeText).not.toContain('结构化思考')
  })

  it('changes request identity when document generation changes even if caret text is unchanged', () => {
    const state = stateWithCaretInSecondBlock('前文', '相同文本')
    const first = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 1,
      maxChars: 320,
    })
    const second = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 2,
      maxChars: 320,
    })

    expect(first?.beforeText).toBe(second?.beforeText)
    expect(first?.position).toBe(second?.position)
    expect(first?.key).not.toBe(second?.key)
  })

  it('changes request identity when moving between blocks with the same text', () => {
    const first = promptSection('context', '一样')
    const second = promptSection('constraint', '一样')
    const doc = schema.nodes.doc.create(null, [first, second])
    const firstCaret = 1 + first.content.size
    const secondCaret = first.nodeSize + 1 + second.content.size

    const firstContext = buildEditorCompletionContext(
      EditorState.create({ schema, doc, selection: TextSelection.create(doc, firstCaret) }),
      { documentId: 'doc-1', documentVersion: 1, maxChars: 320 },
    )
    const secondContext = buildEditorCompletionContext(
      EditorState.create({ schema, doc, selection: TextSelection.create(doc, secondCaret) }),
      { documentId: 'doc-1', documentVersion: 1, maxChars: 320 },
    )

    expect(firstContext?.beforeText).toBe('一样')
    expect(secondContext?.beforeText).toBe('一样')
    expect(firstContext?.sectionKind).toBe('context')
    expect(secondContext?.sectionKind).toBe('constraint')
    expect(firstContext?.key).not.toBe(secondContext?.key)
  })
})
