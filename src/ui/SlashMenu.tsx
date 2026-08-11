import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'
import './slashMenu.css'

const MENU_GAP = 6
const VIEWPORT_PADDING = 8

export interface SlashMenuAnchor {
  caretLeft: number
  caretTop: number
  caretBottom: number
  viewportLeft: number
  viewportTop: number
  viewportRight: number
  viewportBottom: number
}

export interface SlashMenuPosition {
  left: number
  top: number
}

export function placeSlashMenu(
  anchor: SlashMenuAnchor,
  menuWidth: number,
  menuHeight: number,
): SlashMenuPosition {
  const minLeft = anchor.viewportLeft + VIEWPORT_PADDING
  const maxLeft = Math.max(minLeft, anchor.viewportRight - VIEWPORT_PADDING - menuWidth)
  const left = Math.min(Math.max(anchor.caretLeft, minLeft), maxLeft)

  const below = anchor.caretBottom + MENU_GAP
  const maxTop = anchor.viewportBottom - VIEWPORT_PADDING - menuHeight
  const above = anchor.caretTop - MENU_GAP - menuHeight
  const top = below <= maxTop ? below : Math.max(anchor.viewportTop + VIEWPORT_PADDING, above)

  return { left, top }
}

export function nextSlashMenuIndex(currentIndex: number, key: string, itemCount: number): number {
  if (itemCount <= 0) return -1
  if (key === 'ArrowDown') return (currentIndex + 1) % itemCount
  if (key === 'ArrowUp') return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  return currentIndex
}

interface SlashMenuProps {
  onClose(): void
  onEscape?(): void
  onInsert(kind: SectionKind): void
}

export function SlashMenu(props: SlashMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<SlashMenuPosition | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const menu = menuRef.current
    const selection = window.getSelection()
    const container = menu?.offsetParent
    if (!menu || !(container instanceof HTMLElement) || !selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) return

    const caretRect = range.getClientRects()[0] ?? range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const anchor: SlashMenuAnchor = {
      caretLeft: caretRect.left - containerRect.left + container.scrollLeft,
      caretTop: caretRect.top - containerRect.top + container.scrollTop,
      caretBottom: caretRect.bottom - containerRect.top + container.scrollTop,
      viewportLeft: container.scrollLeft,
      viewportTop: container.scrollTop,
      viewportRight: container.scrollLeft + container.clientWidth,
      viewportBottom: container.scrollTop + container.clientHeight,
    }
    const menuRect = menu.getBoundingClientRect()
    setPosition(placeSlashMenu(anchor, menuRect.width, menuRect.height))
  }, [])

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
      const handleEscape = props.onEscape ?? props.onClose
      handleEscape()
      return
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    focusItem(nextSlashMenuIndex(activeIndex, event.key, sectionKinds.length))
  }

  const positionStyle: CSSProperties = {
    left: position?.left ?? 0,
    top: position?.top ?? 0,
    visibility: position ? 'visible' : 'hidden',
  }

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      role="menu"
      aria-label="Prompt 结构"
      style={positionStyle}
      onKeyDown={handleKeyDown}
    >
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
