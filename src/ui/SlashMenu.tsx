import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'
import './slashMenu.css'

const MENU_GAP = 6
const VIEWPORT_PADDING = 8

export interface SlashMenuAnchor {
  caretLeft: number
  caretTop: number
  caretBottom: number
  viewportWidth: number
  viewportHeight: number
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
  const minLeft = VIEWPORT_PADDING
  const maxLeft = Math.max(minLeft, anchor.viewportWidth - VIEWPORT_PADDING - menuWidth)
  const left = Math.min(Math.max(anchor.caretLeft, minLeft), maxLeft)

  const below = anchor.caretBottom + MENU_GAP
  const above = anchor.caretTop - MENU_GAP - menuHeight
  const maxTop = Math.max(VIEWPORT_PADDING, anchor.viewportHeight - VIEWPORT_PADDING - menuHeight)
  const top =
    below <= maxTop
      ? below
      : above >= VIEWPORT_PADDING
        ? above
        : Math.min(Math.max(below, VIEWPORT_PADDING), maxTop)

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

  useLayoutEffect(() => {
    const menu = menuRef.current
    const selection = window.getSelection()
    const editorRoot = document.querySelector('.prompt-editor__content')
    if (!menu || !(editorRoot instanceof HTMLElement) || !selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!editorRoot.contains(range.commonAncestorContainer)) return

    const caretRect = range.getClientRects()[0] ?? range.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    setPosition(
      placeSlashMenu(
        {
          caretLeft: caretRect.left,
          caretTop: caretRect.top,
          caretBottom: caretRect.bottom,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
        menuRect.width,
        menuRect.height,
      ),
    )
  }, [])

  useEffect(() => {
    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        const handleEscape = props.onEscape ?? props.onClose
        handleEscape()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        props.onInsert(sectionKinds[activeIndex])
        return
      }

      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      setActiveIndex((currentIndex) =>
        nextSlashMenuIndex(currentIndex, event.key, sectionKinds.length),
      )
    }

    window.addEventListener('keydown', handleWindowKeyDown, true)
    return () => window.removeEventListener('keydown', handleWindowKeyDown, true)
  }, [activeIndex, props.onClose, props.onEscape, props.onInsert])

  const positionStyle: CSSProperties = {
    position: 'fixed',
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
    >
      <div className="slash-menu__head">
        <span>Prompt 结构</span>
        <button
          type="button"
          aria-label="关闭 Prompt 结构菜单"
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={props.onClose}
        >
          ×
        </button>
      </div>
      {sectionKinds.map((kind, index) => {
        const meta = sectionKindMeta[kind]
        return (
          <button
            key={kind}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={index === activeIndex ? 'slash-item slash-item--active' : 'slash-item'}
            data-kind={kind}
            onMouseDown={(event) => event.preventDefault()}
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
