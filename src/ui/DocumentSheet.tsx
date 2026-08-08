import { useState } from 'react'
import type { PromptDocument } from '../prompt/schema'

export function DocumentSheet(props: {
  documents: PromptDocument[]
  currentId: string
  onClose(): void
  onSwitch(id: string): void
  onCreate(): void
  onDelete(): void
  onExport(): void
  onImport(file: File): void
}) {
  const [query, setQuery] = useState('')
  const visible = props.documents.filter((document) =>
    document.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="overlay" onMouseDown={props.onClose}>
      <section className="sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <strong>本地 Prompt</strong>
            <small>编辑内容会自动保存到当前浏览器</small>
          </div>
          <button className="icon-button" onClick={props.onClose}>×</button>
        </div>
        <div className="privacy-note">
          <strong>✓ 已启用浏览器自动保存</strong>
          <br />
          平时不需要手动保存。若要迁移到另一台电脑、重装浏览器前留备份，使用下面的“保存备份到电脑”。
        </div>
        <input
          className="sheet-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索本地 Prompt…"
        />
        <div className="document-list">
          {visible.map((document) => (
            <button
              key={document.id}
              className={document.id === props.currentId ? 'document-item document-item--active' : 'document-item'}
              onClick={() => props.onSwitch(document.id)}
            >
              <strong>{document.title || '未命名 Prompt'}</strong>
              <small>{new Date(document.updatedAt).toLocaleString()}</small>
            </button>
          ))}
        </div>
        <div className="backup-actions">
          <button className="ghost-button" onClick={props.onExport}>保存备份到电脑</button>
          <label className="ghost-button file-import">
            从电脑恢复备份
            <input
              type="file"
              accept="application/json,.json"
              aria-label="从电脑选择 PromptNote 备份文件"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) props.onImport(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        <div className="privacy-note">
          备份文件使用 PromptNote JSON 格式；这是可迁移的电脑文件，与浏览器里的自动保存是两回事。
        </div>
        <div className="sheet-actions">
          <button className="ghost-button danger-text" onClick={props.onDelete}>删除当前</button>
          <button className="primary-button" onClick={props.onCreate}>＋ 新建 Prompt</button>
        </div>
      </section>
    </div>
  )
}
