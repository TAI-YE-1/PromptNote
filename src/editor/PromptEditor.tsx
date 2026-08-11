import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PromptSection } from './promptSection'
import { GhostCompletion, setGhostCompletion } from './ghostCompletion'
import {
  buildEditorCompletionContext,
  type EditorCompletionContext,
  type EditorCompletionSuggestion,
} from './completionContext'
import {
  buildEditorSelectionSnapshot,
  type EditorSelectionSnapshot,
} from './selectionSnapshot'
import type { PromptNodeJSON } from '../prompt/schema'
import type { SectionKind } from '../prompt/sectionKinds'
import {
  createBlockConversionTransaction,
  type EditableBlockFormat,
} from './blockConversion'
import {
  createAppendSectionTransaction,
  createSlashSectionTransaction,
} from './sectionInsertion'
import {
  isSlashMenuKey,
  shouldOpenSlashMenu,
  type SlashMenuAnchor,
  type SlashMenuKey,
} from './slashCommand'

export type { EditorCompletionContext } from './completionContext'
export type { EditorSelectionSnapshot } from './selectionSnapshot'

export interface PromptEditorHandle {
  insertSection(kind: SectionKind): void
  insertText(text: string): void
  replaceRange(from: number, to: number, text: string): void
  appendSection(kind: SectionKind, text: string): void
  convertSelectedBlock(format: EditableBlockFormat): void
  focus(): void
}

export interface PromptEditorProps {
  documentId: string
  content: PromptNodeJSON
  completionText: EditorCompletionSuggestion | null
  completionContextChars: number
  onChange(content: PromptNodeJSON): void
  onSelectionChange(selection: EditorSelectionSnapshot | null): void
  onCompletionContext(context: EditorCompletionContext | null): void
  onSlashRequest(anchor: SlashMenuAnchor): void
  onSlashMenuKey(key: SlashMenuKey): boolean
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  props,
  ref,
) {
  const completionContextKeyRef = useRef<string | null>(null)
  const documentVersionRef = useRef(0)
  const documentIdRef = useRef(props.documentId)
  const completionContextCharsRef = useRef(props.completionContextChars)
  const appliedDocumentIdRef = useRef(props.documentId)
  const appliedContentRef = useRef(props.content)
  const onSlashRequestRef = useRef(props.onSlashRequest)
  const onSlashMenuKeyRef = useRef(props.onSlashMenuKey)
  documentIdRef.current = props.documentId
  completionContextCharsRef.current = props.completionContextChars
  onSlashRequestRef.current = props.onSlashRequest
  onSlashMenuKeyRef.current = props.onSlashMenuKey

  const editor = useEditor({
    extensions: [StarterKit, PromptSection, GhostCompletion],
    content: props.content as JSONContent,
    editorProps: {
      attributes: { class: 'prompt-editor__content', spellcheck: 'false' },
      handleKeyDown: (view, event) => {
        if (isSlashMenuKey(event.key) && onSlashMenuKeyRef.current(event.key)) {
          event.preventDefault()
          event.stopPropagation()
          return true
        }

        const slashCommandRequested =
          event.key === '/' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.isComposing &&
          !view.composing &&
          shouldOpenSlashMenu(view.state)

        if (slashCommandRequested) {
          const caret = view.coordsAtPos(view.state.selection.from)
          event.preventDefault()
          event.stopPropagation()
          onSlashRequestRef.current({ left: caret.left, top: caret.top, bottom: caret.bottom })
          return true
        }
        return false
      },
      handleTextInput: (view, _from, _to, text) => {
        if (text !== '/' || view.composing || !shouldOpenSlashMenu(view.state)) return false
        const caret = view.coordsAtPos(view.state.selection.from)
        onSlashRequestRef.current({ left: caret.left, top: caret.top, bottom: caret.bottom })
        return true
      },
    },
    onUpdate: ({ editor: current }) => {
      documentVersionRef.current += 1
      const content = current.getJSON() as PromptNodeJSON
      appliedContentRef.current = content
      props.onChange(content)
      emitCompletionContext(current)
      emitSelectionSnapshot(current)
    },
    onSelectionUpdate: ({ editor: current }) => {
      emitCompletionContext(current)
      emitSelectionSnapshot(current)
    },
    onFocus: ({ editor: current }) => {
      emitCompletionContext(current)
      emitSelectionSnapshot(current)
    },
    onBlur: ({ editor: current }) => invalidateCompletion(current),
  })

  useEffect(() => {
    if (!editor) return
    const documentChanged = appliedDocumentIdRef.current !== props.documentId
    const contentChanged = appliedContentRef.current !== props.content
    if (!documentChanged && !contentChanged) return

    appliedDocumentIdRef.current = props.documentId
    appliedContentRef.current = props.content
    documentVersionRef.current += 1
    if (contentChanged) {
      editor.commands.setContent(props.content as JSONContent, {
        emitUpdate: false,
        errorOnInvalidContent: true,
      })
    }
    invalidateCompletion(editor)
    props.onSelectionChange(null)
  }, [editor, props.content, props.documentId])

  useEffect(() => {
    if (!editor) return
    const completion = props.completionText
    const selection = editor.state.selection
    const isCurrent =
      completion !== null &&
      completion.documentId === documentIdRef.current &&
      completion.contextKey === completionContextKeyRef.current &&
      selection.empty &&
      selection.head === completion.position &&
      editor.view.hasFocus()
    setGhostCompletion(editor.view, isCurrent ? completion : null)
  }, [editor, props.completionText])

  useEffect(() => {
    if (!editor) return
    invalidateCompletion(editor)
    emitCompletionContext(editor)
  }, [props.completionContextChars, editor])

  function publishCompletionContext(context: EditorCompletionContext | null) {
    const key = context?.key ?? null
    if (completionContextKeyRef.current === key) return
    completionContextKeyRef.current = key
    props.onCompletionContext(context)
  }

  function invalidateCompletion(currentEditor: NonNullable<typeof editor>) {
    setGhostCompletion(currentEditor.view, null)
    publishCompletionContext(null)
  }

  function emitCompletionContext(currentEditor: NonNullable<typeof editor>) {
    if (!currentEditor.view.hasFocus() || currentEditor.view.composing) {
      invalidateCompletion(currentEditor)
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

  function emitSelectionSnapshot(currentEditor: NonNullable<typeof editor>) {
    props.onSelectionChange(buildEditorSelectionSnapshot(currentEditor.state))
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
      insertSection(kind) {
        if (!editor) return
        const transaction = createSlashSectionTransaction(editor.state, kind)
        if (!transaction) return
        editor.view.dispatch(transaction.scrollIntoView())
        editor.commands.focus()
        props.onSelectionChange(null)
      },
      insertText(text) {
        editor?.chain().focus().insertContent(text).run()
      },
      replaceRange(from, to, text) {
        editor?.chain().focus().insertContentAt({ from, to }, text).run()
      },
      appendSection(kind, text) {
        if (!editor) return
        const transaction = createAppendSectionTransaction(editor.state, kind, text)
        if (!transaction) return
        editor.view.dispatch(transaction.scrollIntoView())
        editor.commands.focus()
      },
      convertSelectedBlock,
      focus() {
        editor?.commands.focus()
      },
    }),
    [editor],
  )

  return <EditorContent editor={editor} />
})
