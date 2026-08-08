import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { COMPLETION_CONTEXT_MAX } from '../ai/completionTuning'
import { PromptSection } from './promptSection'
import { GhostCompletion, setGhostCompletion } from './ghostCompletion'
import {
  buildEditorCompletionContext,
  type EditorCompletionContext,
  type EditorCompletionSuggestion,
} from './completionContext'
import type { PromptNodeJSON } from '../prompt/schema'
import type { SectionKind } from '../prompt/sectionKinds'
import {
  createBlockConversionTransaction,
  getActiveBlockFormat,
  type EditableBlockFormat,
} from './blockConversion'

export type { EditorCompletionContext } from './completionContext'

export interface EditorSelectionSnapshot {
  text: string
  from: number
  to: number
  blockFormat: EditableBlockFormat
  rect: {
    left: number
    top: number
    width: number
    height: number
    containerWidth: number
  }
}

export interface PromptEditorHandle {
  insertSection(kind: SectionKind, text?: string): void
  replaceRange(from: number, to: number, text: string): void
  appendSection(kind: SectionKind, text: string): void
  convertSelectedBlock(format: EditableBlockFormat): void
  focus(): void
}

interface PromptEditorProps {
  documentId: string
  content: PromptNodeJSON
  completionText: EditorCompletionSuggestion | null
  completionContextChars?: number
  onChange(content: PromptNodeJSON): void
  onSelectionChange(selection: EditorSelectionSnapshot | null): void
  onCompletionContext(context: EditorCompletionContext | null): void
  onSlashRequest(): void
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  props,
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const completionContextKeyRef = useRef<string | null>(null)
  const documentVersionRef = useRef(0)
  const documentIdRef = useRef(props.documentId)
  const completionContextChars = props.completionContextChars ?? COMPLETION_CONTEXT_MAX
  const completionContextCharsRef = useRef(completionContextChars)
  documentIdRef.current = props.documentId
  completionContextCharsRef.current = completionContextChars

  const editor = useEditor({
    extensions: [StarterKit, PromptSection, GhostCompletion],
    content: props.content as JSONContent,
    editorProps: {
      attributes: { class: 'prompt-editor__content', spellcheck: 'false' },
      handleKeyDown: (_view, event) => {
        if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          props.onSlashRequest()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: current }) => {
      documentVersionRef.current += 1
      props.onChange(current.getJSON())
      emitCompletionContext(current)
    },
    onSelectionUpdate: ({ editor: current }) => emitCompletionContext(current),
    onFocus: ({ editor: current }) => emitCompletionContext(current),
    onBlur: () => publishCompletionContext(null),
  })

  useEffect(() => {
    if (!editor) return
    documentVersionRef.current += 1
    editor.commands.setContent(props.content as JSONContent, {
      emitUpdate: false,
      errorOnInvalidContent: true,
    })
    setGhostCompletion(editor.view, null)
    props.onSelectionChange(null)
    completionContextKeyRef.current = null
    props.onCompletionContext(null)
  }, [editor, props.documentId])

  useEffect(() => {
    if (!editor) return
    const completion = props.completionText
    const selection = editor.state.selection
    const isCurrent =
      completion !== null &&
      completion.documentId === props.documentId &&
      completion.contextKey === completionContextKeyRef.current &&
      selection.empty &&
      selection.head === completion.position &&
      editor.view.hasFocus()

    setGhostCompletion(editor.view, isCurrent ? completion : null)
  }, [editor, props.completionText, props.documentId])

  useEffect(() => {
    if (!editor) return
    completionContextKeyRef.current = null
    emitCompletionContext(editor)
  }, [completionContextChars, editor])

  function publishCompletionContext(context: EditorCompletionContext | null) {
    const key = context?.key ?? null
    if (completionContextKeyRef.current === key) return
    completionContextKeyRef.current = key
    props.onCompletionContext(context)
  }

  function emitCompletionContext(currentEditor: NonNullable<typeof editor>) {
    if (!currentEditor.view.hasFocus()) {
      publishCompletionContext(null)
      return
    }

    publishCompletionContext(
      buildEditorCompletionContext(currentEditor.state, {
        documentId: documentIdRef.current,
        documentVersion: documentVersionRef.current,
        maxChars: completionContextCharsRef.current,
      }),
    )
  }

  function convertSelectedBlock(format: EditableBlockFormat) {
    if (!editor) return
    const transaction = createBlockConversionTransaction(editor.state, format)
    if (!transaction) return
    editor.view.dispatch(transaction.scrollIntoView())
    editor.commands.focus()
    props.onSelectionChange(null)
  }

  useImperativeHandle(
    ref,
    () => ({
      insertSection(kind, text = '') {
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: 'promptSection',
            attrs: { kind },
            content: text ? [{ type: 'text', text }] : [],
          })
          .run()
      },
      replaceRange(from, to, text) {
        editor?.chain().focus().insertContentAt({ from, to }, text).run()
      },
      appendSection(kind, text) {
        editor
          ?.chain()
          .focus('end')
          .insertContent({ type: 'promptSection', attrs: { kind }, content: [{ type: 'text', text }] })
          .run()
      },
      convertSelectedBlock,
      focus() {
        editor?.commands.focus()
      },
    }),
    [editor],
  )

  function captureSelection() {
    if (!editor || editor.state.selection.empty) {
      props.onSelectionChange(null)
      return
    }

    const activeBlock = getActiveBlockFormat(editor.state)
    if (!activeBlock) {
      props.onSelectionChange(null)
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    props.onSelectionChange({
      text: editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, '\n'),
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      blockFormat: activeBlock.format,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        containerWidth: window.innerWidth,
      },
    })
  }

  return (
    <div
      ref={rootRef}
      className="prompt-editor"
      onMouseUp={() => window.setTimeout(captureSelection, 0)}
      onKeyUp={(event) => {
        if (event.shiftKey || event.key.startsWith('Arrow')) window.setTimeout(captureSelection, 0)
      }}
    >
      <EditorContent editor={editor} />
    </div>
  )
})
