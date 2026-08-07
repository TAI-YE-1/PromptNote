import { Extension } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface GhostCompletionState {
  text: string | null
  position: number | null
}

export const ghostCompletionKey = new PluginKey<GhostCompletionState>('promptnoteGhostCompletion')

function stateFor(text: string | null, position: number | null): GhostCompletionState {
  if (!text || !text.trim()) return { text: null, position: null }
  return { text: text.trimEnd(), position }
}

export function createGhostCompletionPlugin(): Plugin<GhostCompletionState> {
  return new Plugin<GhostCompletionState>({
    key: ghostCompletionKey,
    state: {
      init: () => stateFor(null, null),
      apply(transaction, previous, _oldState, nextState) {
        const explicit = transaction.getMeta(ghostCompletionKey) as
          | { text: string | null }
          | undefined
        if (explicit) {
          return stateFor(explicit.text, explicit.text ? nextState.selection.head : null)
        }
        if (transaction.docChanged || transaction.selectionSet) return stateFor(null, null)
        return previous
      },
    },
    props: {
      decorations(state) {
        const ghost = ghostCompletionKey.getState(state)
        if (
          !ghost?.text ||
          ghost.position === null ||
          !state.selection.empty ||
          state.selection.head !== ghost.position
        ) {
          return null
        }

        return DecorationSet.create(state.doc, [
          Decoration.widget(
            ghost.position,
            () => {
              const span = document.createElement('span')
              span.className = 'prompt-ghost-completion'
              span.setAttribute('aria-hidden', 'true')
              span.textContent = ghost.text
              return span
            },
            { side: 1, key: 'promptnote-ghost-completion' },
          ),
        ])
      },
      handleKeyDown(view, event) {
        const ghost = ghostCompletionKey.getState(view.state)
        if (!ghost?.text) return false

        if (event.key === 'Tab') {
          event.preventDefault()
          view.dispatch(
            view.state.tr
              .insertText(ghost.text, view.state.selection.from, view.state.selection.to)
              .setMeta(ghostCompletionKey, { text: null })
              .scrollIntoView(),
          )
          return true
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          clearGhostCompletion(view)
          return true
        }

        return false
      },
    },
  })
}

export const GhostCompletion = Extension.create({
  name: 'ghostCompletion',
  addProseMirrorPlugins() {
    return [createGhostCompletionPlugin()]
  },
})

export function setGhostCompletion(view: EditorView, text: string | null): void {
  view.dispatch(view.state.tr.setMeta(ghostCompletionKey, { text }))
}

export function clearGhostCompletion(view: EditorView): void {
  setGhostCompletion(view, null)
}

export function hasGhostCompletion(view: EditorView): boolean {
  return Boolean(getGhostCompletion(view.state)?.text)
}

export function getGhostCompletion(state: EditorState): GhostCompletionState | null {
  return ghostCompletionKey.getState(state) ?? null
}
