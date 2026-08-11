import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { sectionKindMeta, sectionKinds } from '../src/prompt/sectionKinds'
import { SlashMenu } from '../src/ui/components'
import { nextSlashMenuIndex } from '../src/ui/SlashMenu'

describe('SlashMenu', () => {
  it('renders every authoritative semantic section exactly once', () => {
    const html = renderToStaticMarkup(<SlashMenu onClose={() => undefined} onInsert={() => undefined} />)

    for (const kind of sectionKinds) {
      expect(html.match(new RegExp(`data-kind="${kind}"`, 'g'))).toHaveLength(1)
      expect(html).toContain(sectionKindMeta[kind].label)
      expect(html).toContain(sectionKindMeta[kind].description)
    }
  })

  it('does not introduce a parallel semantic kind outside sectionKinds', () => {
    const html = renderToStaticMarkup(<SlashMenu onClose={() => undefined} onInsert={() => undefined} />)
    const renderedKinds = [...html.matchAll(/data-kind="([^"]+)"/g)].map((match) => match[1])

    expect(renderedKinds).toEqual([...sectionKinds])
  })

  it('keeps editor focus instead of moving DOM focus into the menu', () => {
    const html = renderToStaticMarkup(<SlashMenu onClose={() => undefined} onInsert={() => undefined} />)
    expect(html).toContain('role="menu"')
    expect(html).toContain('slash-item slash-item--active')
    expect(html).not.toContain('tabindex="0"')
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
