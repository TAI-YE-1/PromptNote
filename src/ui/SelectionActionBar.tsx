import { sectionKindMeta, sectionKinds } from '../prompt/sectionKinds'
import type { EditableBlockFormat } from '../editor/blockConversion'
import type { EditorSelectionSnapshot } from '../editor/PromptEditor'
import './selectionActionBar.css'

export function SelectionActionBar(props: {
  selection: EditorSelectionSnapshot
  onAction(action: 'clarify' | 'shorten' | 'split_constraints'): void
  onMore(): void
  onConvert(format: EditableBlockFormat): void
}) {
  const format = props.selection.blockFormat
  const selectedChars = Array.from(props.selection.text).length

  return (
    <section
      className="selection-actionbar"
      aria-label="选中文字操作"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="selection-actionbar__meta">
        <strong>已选 {selectedChars} 字</strong>
        <label>
          <span>类型</span>
          <select
            aria-label="转换选中文本块类型"
            value={format ?? ''}
            disabled={!format}
            onChange={(event) => props.onConvert(event.target.value as EditableBlockFormat)}
          >
            {!format && <option value="">跨块选区</option>}
            <option value="paragraph">普通段落</option>
            {sectionKinds.map((kind) => (
              <option key={kind} value={kind}>
                {sectionKindMeta[kind].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="selection-actionbar__actions">
        <button onMouseDown={keepEditorSelection} onClick={() => props.onAction('clarify')}>
          改清楚
        </button>
        <button onMouseDown={keepEditorSelection} onClick={() => props.onAction('shorten')}>
          缩短
        </button>
        <button onMouseDown={keepEditorSelection} onClick={() => props.onAction('split_constraints')}>
          拆约束
        </button>
        <button onMouseDown={keepEditorSelection} onClick={props.onMore}>
          更多 AI
        </button>
      </div>
    </section>
  )
}

function keepEditorSelection(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
}
