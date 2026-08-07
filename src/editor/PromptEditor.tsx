import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PromptSection } from './promptSection'
import type { PromptNodeJSON } from '../prompt/schema'
import type { SectionKind } from '../prompt/sectionKinds'
import {
  createBlockConversionTransaction,
  getActiveBlockFormat,
  type EditableBlockFormat,
} from './blockConversion'

export interface EditorSelectionSnapshot {
  text: string
  from: number
  to: number
  blockFormat: EditableBlockFormat | null
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
  onChange(content: PromptNodeJSON): void
  onSelectionChange(selection: EditorSelectionSnapshot | null): void
  onSlashRequest(): void
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  props,
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const editor = useEditor({
    extensions: [StarterKit, PromptSection],
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
    onUpdate: ({ editor: current }) => props.onChange(current.getJSON()),
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(props.content as JSONContent, {
      emitUpdate: false,
      errorOnInvalidContent: true,
    })
    props.onSelectionChange(null)
  }, [editor, props.documentId])

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

    const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, '\n')
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const rootRect = rootRef.current?.getBoundingClientRect()
    if (!rootRect) return

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    const activeBlock = getActiveBlockFormat(editor.state)

    props.onSelectionChange({
      text,
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      blockFormat: activeBlock?.format ?? null,
      rect: {
        left: rect.left - rootRect.left,
        top: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
        containerWidth: rootRect.width,
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
