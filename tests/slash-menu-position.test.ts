import { describe, expect, it } from 'vitest'
import { placeSlashMenu } from '../src/ui/SlashMenu'
import type { SlashMenuAnchor } from '../src/editor/slashCommand'

const baseAnchor: SlashMenuAnchor = {
  left: 120,
  top: 180,
  bottom: 200,
}

describe('slash menu caret placement', () => {
  it('opens below the ProseMirror caret when there is enough room', () => {
    expect(placeSlashMenu(baseAnchor, 280, 260, 360, 640)).toEqual({ left: 72, top: 206 })
  })

  it('flips directly above the ProseMirror caret near the viewport bottom', () => {
    expect(
      placeSlashMenu({ left: 120, top: 570, bottom: 590 }, 280, 260, 360, 640),
    ).toEqual({ left: 72, top: 304 })
  })

  it('keeps the menu inside horizontal viewport bounds', () => {
    expect(placeSlashMenu({ ...baseAnchor, left: 340 }, 280, 260, 360, 640).left).toBe(72)
    expect(placeSlashMenu({ ...baseAnchor, left: 2 }, 280, 260, 360, 640).left).toBe(8)
  })
})
