import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { sectionKindMeta, sectionKinds } from '../src/prompt/sectionKinds'
import { SlashMenu } from '../src/ui/components'
import { nextSlashMenuIndex } from '../src/editor/slashCommand'

const anchor = { left: 100, top: 120, bottom: 140 }

function renderMenu(activeIndex = 0) {
  return renderToStaticMarkup(
    <SlashMenu
      anchor={anchor}
      activeIndex={activeIndex}
      onActiveIndex={() => undefined}
      onClose={() => undefined}
      onInsert={() => undefined}
    />,
  )
}

describe('SlashMenu', () => {
  it('renders every authoritative semantic section exactly once', () => {
    const html = renderMenu()
    for (const kind of sectionKinds) {
      expect(html.match(new RegExp(`data-kind="${kind}"`, 'g'))).toHaveLength(1)
      expect(html).toContain(sectionKindMeta[kind].label)
      expect(html).toContain(sectionKindMeta[kind].description)
    }
  })

  it('uses a controlled active index without moving DOM focus into the menu', () => {
    const html = renderMenu(2)
    expect(html).toContain('role="menu"')
    expect(html).not.toContain('tabindex="0"')
    expect(html).toContain('aria-selected="true"')
    expect(html.match(/tabindex="-1"/g)?.length).toBeGreaterThanOrEqual(sectionKinds.length)
  })

  it('moves keyboard selection with wrapping and Home/End', () => {
    expect(nextSlashMenuIndex(0, 'ArrowDown', 3)).toBe(1)
    expect(nextSlashMenuIndex(2, 'ArrowDown', 3)).toBe(0)
    expect(nextSlashMenuIndex(0, 'ArrowUp', 3)).toBe(2)
    expect(nextSlashMenuIndex(1, 'Home', 3)).toBe(0)
    expect(nextSlashMenuIndex(1, 'End', 3)).toBe(2)
  })
})
