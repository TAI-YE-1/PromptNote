import { useState } from 'react'
import { sectionKindMeta, sectionKinds } from '../prompt/sectionKinds'
import type { EditableBlockFormat } from '../editor/blockConversion'
import type { EditorSelectionSnapshot } from '../editor/PromptEditor'
import './floatingPanels.css'

export function SelectionContextMenu(props: {
  selection: EditorSelectionSnapshot
  onAction(action: 'clarify' | 'shorten' | 'split_constraints'): void
  onMore(): void
  onConvert(format: EditableBlockFormat): void
}) {
  const [open, setOpen] = useState(false)
  const { rect } = props.selection
  const left = clamp(rect.left + rect.width + 8, 8, Math.max(8, rect.containerWidth - 36))
  const placeBelow = rect.top < 46
  const top = placeBelow ? rect.top + rect.height + 6 : Math.max(8, rect.top - 34)
  const currentLabel =
    props.selection.blockFormat === 'paragraph'
      ? '普通段落'
      : sectionKindMeta[props.selection.blockFormat].label

  return (
    <div
      className={`selection-context selection-context--viewport selection-context--${placeBelow ? 'below' : 'above'}`}
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        className="selection-context__trigger"
        aria-label="文本操作"
        aria-expanded={open}
        title="文本操作"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden>•••</span>
      </button>
      {open && (
        <div className="selection-context__menu">
          <div className="selection-context__section-label">AI 辅助</div>
          <div className="selection-context__actions">
            <button onClick={() => props.onAction('clarify')}>改清楚</button>
            <button onClick={() => props.onAction('shorten')}>缩短</button>
            <button onClick={() => props.onAction('split_constraints')}>拆成约束</button>
          </div>
          <button className="selection-context__more" onClick={props.onMore}>
            更多 AI 辅助…
          </button>
          <label className="selection-context__format">
            <span>文本类型</span>
            <select
              aria-label="转换当前文本块类型"
              value={props.selection.blockFormat}
              onChange={(event) => props.onConvert(event.target.value as EditableBlockFormat)}
            >
              <option value="paragraph">普通段落</option>
              {sectionKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {sectionKindMeta[kind].label}
                </option>
              ))}
            </select>
          </label>
          <div className="selection-context__current">当前：{currentLabel}</div>
        </div>
      )}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
