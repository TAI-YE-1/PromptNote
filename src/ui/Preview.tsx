import type { CompileFormat } from '../prompt/compiler'

export function Preview(props: {
  text: string
  format: CompileFormat
  onFormat(format: CompileFormat): void
  onBack(): void
  onCopy(): void
}) {
  return (
    <div className="preview-view">
      <header className="preview-head">
        <button className="icon-button" onClick={props.onBack} aria-label="返回编辑">
          ←
        </button>
        <strong>Prompt Preview</strong>
        <span />
      </header>
      <div className="preview-body">
        <div className="format-tabs">
          {(['plain', 'markdown', 'xml'] as const).map((format) => (
            <button
              key={format}
              className={props.format === format ? 'format-tab format-tab--active' : 'format-tab'}
              onClick={() => props.onFormat(format)}
            >
              {format === 'plain' ? 'Plain' : format === 'markdown' ? 'Markdown' : 'XML'}
            </button>
          ))}
        </div>
        <pre>{props.text}</pre>
      </div>
      <footer className="preview-actions preview-actions--single">
        <button className="primary-button" onClick={props.onCopy}>
          复制当前格式
        </button>
      </footer>
    </div>
  )
}
