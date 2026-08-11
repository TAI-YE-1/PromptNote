import { describe, expect, it } from 'vitest'
import editorSource from '../src/editor/PromptEditor.tsx?raw'
import menuSource from '../src/ui/SlashMenu.tsx?raw'

describe('slash menu runtime boundary', () => {
  it('anchors from ProseMirror coordinates at slash key time', () => {
    expect(editorSource).toContain('view.coordsAtPos(view.state.selection.from)')
    expect(editorSource).toContain('onSlashRequestRef.current')
  })

  it('keeps keyboard ownership in PromptEditor instead of the React menu', () => {
    expect(editorSource).toContain('onSlashMenuKeyRef.current')
    expect(menuSource).not.toContain('window.getSelection')
    expect(menuSource).not.toContain("addEventListener('keydown'")
  })
})
