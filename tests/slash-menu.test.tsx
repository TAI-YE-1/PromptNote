import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { sectionKindMeta, sectionKinds } from '../src/prompt/sectionKinds'
import { SlashMenu } from '../src/ui/components'

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
})
