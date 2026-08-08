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

function stateWithCaretInSecondBlock(
  firstText: string,
  secondText: string,
  caretOffset = secondText.length,
) {
  const first = promptSection('output_format', firstText)
  const second = promptSection('context', secondText)
  const doc = schema.nodes.doc.create(null, [first, second])
  const secondContentStart = first.nodeSize + 1
  const caret = secondContentStart + caretOffset
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
    expect(context?.afterText).toBe('')
    expect(context?.sectionKind).toBe('context')
    expect(context?.beforeText).not.toContain('结构化思考')
  })

  it('supports a caret at the start of a non-empty block using text after the caret', () => {
    const state = stateWithCaretInSecondBlock('前文', '你是一位结构化思考专家', 0)
    const context = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 1,
      maxChars: 320,
    })

    expect(context?.beforeText).toBe('')
    expect(context?.afterText).toBe('你是一位结构化思考专家')
  })

  it('supports a one-character block instead of requiring two characters before the caret', () => {
    const state = stateWithCaretInSecondBlock('前文', '我')
    const context = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 1,
      maxChars: 320,
    })

    expect(context?.beforeText).toBe('我')
    expect(context?.afterText).toBe('')
  })

  it('captures both sides of a caret in the middle of a long block', () => {
    const text = '你是一位擅长结构化思考的专家，请帮我优化以下描述。我的原文如下：你'
    const caretOffset = text.indexOf('专家') + 1
    const state = stateWithCaretInSecondBlock('完全不同的前块', text, caretOffset)
    const context = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 3,
      maxChars: 40,
    })

    expect(context).not.toBeNull()
    expect(context?.beforeText.length).toBeGreaterThan(0)
    expect(context?.afterText.length).toBeGreaterThan(0)
    expect((context?.beforeText.length ?? 0) + (context?.afterText.length ?? 0)).toBeLessThanOrEqual(40)
    expect(`${context?.beforeText}${context?.afterText}`).not.toContain('完全不同的前块')
  })

  it('honors a small configured context budget at the end of a long block', () => {
    const text = '这是一个很长的当前模块文本，用来验证用户把补全上下文调小以后，编辑器不会偷偷回退到内部的大上下文上限。'
    const state = stateWithCaretInSecondBlock('前块不能泄漏', text)
    const context = buildEditorCompletionContext(state, {
      documentId: 'doc-1',
      documentVersion: 4,
      maxChars: 16,
    })

    expect(context).not.toBeNull()
    expect(context?.afterText).toBe('')
    expect(context?.beforeText.length).toBeLessThanOrEqual(16)
    expect(context?.beforeText).toBe(text.slice(-16))
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
    expect(first?.afterText).toBe(second?.afterText)
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
