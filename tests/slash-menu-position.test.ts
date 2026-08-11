import { describe, expect, it } from 'vitest'
import { placeSlashMenu, type SlashMenuAnchor } from '../src/ui/SlashMenu'

const baseAnchor: SlashMenuAnchor = {
  caretLeft: 120,
  caretTop: 180,
  caretBottom: 200,
  viewportLeft: 0,
  viewportTop: 0,
  viewportRight: 360,
  viewportBottom: 640,
}

describe('slash menu caret placement', () => {
  it('opens below the caret when there is enough room', () => {
    expect(placeSlashMenu(baseAnchor, 280, 260)).toEqual({ left: 72, top: 206 })
  })

  it('flips above the caret near the bottom of the editor viewport', () => {
    const anchor = {
      ...baseAnchor,
      caretTop: 570,
      caretBottom: 590,
    }

    expect(placeSlashMenu(anchor, 280, 260)).toEqual({ left: 72, top: 304 })
  })

  it('keeps the menu inside the right edge of the editor viewport', () => {
    const anchor = {
      ...baseAnchor,
      caretLeft: 340,
    }

    expect(placeSlashMenu(anchor, 280, 260).left).toBe(72)
  })

  it('keeps the menu inside the left edge of a scrolled editor viewport', () => {
    const anchor = {
      ...baseAnchor,
      caretLeft: 14,
      viewportLeft: 20,
      viewportRight: 380,
    }

    expect(placeSlashMenu(anchor, 280, 260).left).toBe(28)
  })
})
