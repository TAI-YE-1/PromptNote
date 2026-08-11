import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'
import type { SlashMenuAnchor } from '../editor/slashCommand'
import './slashMenu.css'

const MENU_GAP = 6
const VIEWPORT_PADDING = 8

export interface SlashMenuPosition {
  left: number
  top: number
}

export function placeSlashMenu(
  anchor: SlashMenuAnchor,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): SlashMenuPosition {
  const minLeft = VIEWPORT_PADDING
  const maxLeft = Math.max(minLeft, viewportWidth - VIEWPORT_PADDING - menuWidth)
  const left = Math.min(Math.max(anchor.left, minLeft), maxLeft)

  const below = anchor.bottom + MENU_GAP
  const above = anchor.top - MENU_GAP - menuHeight
  const maxTop = Math.max(VIEWPORT_PADDING, viewportHeight - VIEWPORT_PADDING - menuHeight)
  const top =
    below <= maxTop
      ? below
      : above >= VIEWPORT_PADDING
        ? above
        : Math.min(Math.max(below, VIEWPORT_PADDING), maxTop)

  return { left, top }
}

interface SlashMenuProps {
  anchor: SlashMenuAnchor
  activeIndex: number
  onActiveIndex(index: number): void
  onClose(): void
  onInsert(kind: SectionKind): void
}

export function SlashMenu(props: SlashMenuProps) {
  const [position, setPosition] = useState<SlashMenuPosition | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const menuRect = menu.getBoundingClientRect()
    setPosition(
      placeSlashMenu(
        props.anchor,
        menuRect.width,
        menuRect.height,
        window.innerWidth,
        window.innerHeight,
      ),
    )
  }, [props.anchor])

  useLayoutEffect(() => {
    itemRefs.current[props.activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [props.activeIndex])

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
            ref={(node) => { itemRefs.current[index] = node }}
            type="button"
            role="menuitem"
            aria-selected={index === props.activeIndex}
            tabIndex={-1}
            className={index === props.activeIndex ? 'slash-item slash-item--active' : 'slash-item'}
            data-kind={kind}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => props.onActiveIndex(index)}
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
