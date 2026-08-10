import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'
import './slashMenu.css'

export function nextSlashMenuIndex(currentIndex: number, key: string, itemCount: number): number {
  if (itemCount <= 0) return -1
  if (key === 'ArrowDown') return (currentIndex + 1) % itemCount
  if (key === 'ArrowUp') return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  return currentIndex
}

export function SlashMenu(props: { onClose(): void; onInsert(kind: SectionKind): void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    itemRefs.current[0]?.focus({ preventScroll: true })
    return () => previousFocusRef.current?.focus({ preventScroll: true })
  }, [])

  function focusItem(index: number) {
    setActiveIndex(index)
    itemRefs.current[index]?.focus({ preventScroll: true })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      props.onClose()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    focusItem(nextSlashMenuIndex(activeIndex, event.key, sectionKinds.length))
  }

  return (
    <div className="slash-menu" role="menu" aria-label="Prompt 结构" onKeyDown={handleKeyDown}>
      <div className="slash-menu__head">
        <span>Prompt 结构</span>
        <button type="button" aria-label="关闭 Prompt 结构菜单" onClick={props.onClose}>×</button>
      </div>
      {sectionKinds.map((kind, index) => {
        const meta = sectionKindMeta[kind]
        return (
          <button
            key={kind}
            ref={(node) => { itemRefs.current[index] = node }}
            type="button"
            role="menuitem"
            tabIndex={index === activeIndex ? 0 : -1}
            className={index === activeIndex ? 'slash-item slash-item--active' : 'slash-item'}
            data-kind={kind}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => props.onInsert(kind)}
          >
            <span className="slash-item__icon">{meta.icon}</span>
            <span>
              <strong>{meta.label}</strong>
              <small>{meta.description}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}
