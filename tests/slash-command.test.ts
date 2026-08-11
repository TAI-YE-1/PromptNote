import { getSchema } from '@tiptap/core'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { describe, expect, it } from 'vitest'
import {
  isSlashMenuKey,
  nextSlashMenuIndex,
  shouldOpenSlashMenu,
} from '../src/editor/slashCommand'
import { PromptSection } from '../src/editor/promptSection'

const schema = getSchema([StarterKit, PromptSection])

function paragraphState(text: string, from: number, to = from) {
  const paragraph = schema.nodes.paragraph.create(
    null,
    text ? schema.text(text) : undefined,
  )
  const doc = schema.nodes.doc.create(null, [paragraph])
  return EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, from, to),
  })
}

describe('Slash command trigger', () => {
  it('opens at the start of a text block', () => {
    expect(shouldOpenSlashMenu(paragraphState('正文', 1))).toBe(true)
  })

  it('opens after whitespace', () => {
    expect(shouldOpenSlashMenu(paragraphState('A ', 3))).toBe(true)
  })

  it('opens after a hard break', () => {
    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text('第一行'),
      schema.nodes.hardBreak.create(),
      schema.text('第二行'),
    ])
    const doc = schema.nodes.doc.create(null, [paragraph])
    const state = EditorState.create({
      schema,
      doc,
      selection: TextSelection.create(doc, 5),
    })

    expect(shouldOpenSlashMenu(state)).toBe(true)
  })

  it('does not intercept a slash after ordinary text', () => {
    expect(shouldOpenSlashMenu(paragraphState('https:', 7))).toBe(false)
    expect(shouldOpenSlashMenu(paragraphState('2026', 5))).toBe(false)
    expect(shouldOpenSlashMenu(paragraphState('A', 2))).toBe(false)
  })

  it('does not open while replacing a non-empty selection', () => {
    expect(shouldOpenSlashMenu(paragraphState('AB', 1, 2))).toBe(false)
  })
})


describe('Slash menu keyboard contract', () => {
  it('recognizes only menu-owned navigation/commit keys', () => {
    expect(isSlashMenuKey('ArrowDown')).toBe(true)
    expect(isSlashMenuKey('Enter')).toBe(true)
    expect(isSlashMenuKey('Escape')).toBe(true)
    expect(isSlashMenuKey('/')).toBe(false)
    expect(isSlashMenuKey('a')).toBe(false)
  })

  it('wraps the controlled active index', () => {
    expect(nextSlashMenuIndex(0, 'ArrowUp', 7)).toBe(6)
    expect(nextSlashMenuIndex(6, 'ArrowDown', 7)).toBe(0)
  })
})
