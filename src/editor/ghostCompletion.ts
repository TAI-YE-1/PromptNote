import { Extension } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorCompletionSuggestion } from './completionContext'

export interface GhostCompletionState {
  text: string | null
  position: number | null
  contextKey: string | null
}

export const ghostCompletionKey = new PluginKey<GhostCompletionState>('promptnoteGhostCompletion')

function emptyState(): GhostCompletionState {
  return { text: null, position: null, contextKey: null }
}

function stateFor(completion: EditorCompletionSuggestion | null): GhostCompletionState {
  if (!completion?.text || !completion.text.trim()) return emptyState()
  return {
    text: completion.text.trimEnd(),
    position: completion.position,
    contextKey: completion.contextKey,
  }
}

export function createGhostCompletionPlugin(): Plugin<GhostCompletionState> {
  return new Plugin<GhostCompletionState>({
    key: ghostCompletionKey,
    state: {
      init: emptyState,
      apply(transaction, previous, _oldState, nextState) {
        const explicit = transaction.getMeta(ghostCompletionKey) as
          | EditorCompletionSuggestion
          | null
          | undefined
        if (explicit !== undefined) {
          if (!explicit) return emptyState()
          if (
            !nextState.selection.empty ||
            nextState.selection.head !== explicit.position ||
            explicit.position < 0 ||
            explicit.position > nextState.doc.content.size
          ) {
            return emptyState()
          }
          return stateFor(explicit)
        }
        if (transaction.docChanged || transaction.selectionSet) return emptyState()
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
            {
              side: 1,
              // Streaming partials share one context identity but grow over time.
              // Include the visible text in the key so ProseMirror recreates the widget DOM.
              key: `promptnote-ghost-completion:${ghost.contextKey ?? ''}:${ghost.text}`,
            },
          ),
        ])
      },
      handleKeyDown(view, event) {
        const ghost = ghostCompletionKey.getState(view.state)
        if (
          !ghost?.text ||
          ghost.position === null ||
          !view.state.selection.empty ||
          view.state.selection.head !== ghost.position
        ) {
          return false
        }

        if (event.key === 'Tab') {
          event.preventDefault()
          view.dispatch(
            view.state.tr
              .insertText(ghost.text, ghost.position, ghost.position)
              .setMeta(ghostCompletionKey, null)
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

export function setGhostCompletion(
  view: EditorView,
  completion: EditorCompletionSuggestion | null,
): void {
  view.dispatch(view.state.tr.setMeta(ghostCompletionKey, completion))
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
