import { useState } from 'react'
import type { AiAction, AiSettings, PromptLintFinding, PromptSuggestion } from '../ai/types'
import type { CompileFormat } from '../prompt/compiler'
import type { PromptDocument } from '../prompt/schema'
import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'
import type { EditableBlockFormat } from '../editor/blockConversion'
import type { EditorSelectionSnapshot } from '../editor/PromptEditor'

export function SlashMenu(props: { onClose(): void; onInsert(kind: SectionKind): void }) {
  return (
    <div className="slash-menu">
      <div className="slash-menu__head">
        <span>Prompt 结构</span>
        <button onClick={props.onClose}>×</button>
      </div>
      {sectionKinds.map((kind) => {
        const meta = sectionKindMeta[kind]
        return (
          <button
            key={kind}
            className="slash-item"
            data-kind={kind}
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

export function SelectionContextMenu(props: {
  selection: EditorSelectionSnapshot
  onAction(action: 'clarify' | 'shorten' | 'split_constraints'): void
  onMore(): void
  onConvert(format: EditableBlockFormat): void
}) {
  const [open, setOpen] = useState(false)
  const { rect } = props.selection
  const desiredLeft = rect.left + rect.width + 18
  const left = clamp(desiredLeft, 20, Math.max(20, rect.containerWidth - 20))
  const placeBelow = rect.top < 52
  const top = placeBelow ? rect.top + rect.height + 8 : rect.top - 8
  const align = left < 142 ? 'left' : left > rect.containerWidth - 142 ? 'right' : 'center'
  const currentLabel =
    props.selection.blockFormat === 'paragraph'
      ? '普通段落'
      : sectionKindMeta[props.selection.blockFormat].label

  return (
    <div
      className={`selection-context selection-context--${placeBelow ? 'below' : 'above'} selection-context--align-${align}`}
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

export function SuggestionCard(props: {
  suggestion: PromptSuggestion
  stale: boolean
  onAccept(): void
  onIgnore(): void
}) {
  const advisory = props.suggestion.target === 'advisory'
  return (
    <section className={`suggestion-card ${props.stale ? 'suggestion-card--stale' : ''}`}>
      <div className="suggestion-card__head">
        <span>AI 建议 · {props.suggestion.label}</span>
        {props.stale && <span>正文已变化 · 建议已过期</span>}
      </div>
      {props.suggestion.sourceText && (
        <>
          <div className="field-label">原文</div>
          <div className="suggestion-text">{props.suggestion.sourceText}</div>
        </>
      )}
      <div className="field-label">建议</div>
      <div className="suggestion-text suggestion-text--result">
        {props.suggestion.replacementText}
      </div>
      <div className="card-actions">
        <button className="ghost-button" onClick={props.onIgnore}>
          {advisory ? '关闭' : '忽略'}
        </button>
        {!advisory && (
          <button className="primary-button" disabled={props.stale} onClick={props.onAccept}>
            接受
          </button>
        )}
      </div>
    </section>
  )
}

export function LintCard(props: {
  findings: PromptLintFinding[]
  aiReady: boolean
  onDeepCheck(): void
}) {
  return (
    <section className="lint-card">
      <div className="lint-card__head">本地 Prompt 检查</div>
      {props.findings.length === 0 ? (
        <div className="lint-empty">没有发现明显的结构问题；这里不提供 Prompt 分数。</div>
      ) : (
        props.findings.map((finding) => (
          <div className="finding" key={finding.id}>
            <span>{finding.severity === 'warning' ? '⚠' : '○'}</span>
            <div>
              <strong>{finding.message}</strong>
              {finding.detail && <small>{finding.detail}</small>}
            </div>
          </div>
        ))
      )}
      <div className="deep-check">
        <span>{props.aiReady ? '需要语义判断时，可进一步调用 AI。' : '未配置 AI 也不影响以上检查。'}</span>
        <button className="ghost-button" onClick={props.onDeepCheck}>
          {props.aiReady ? 'AI 深度检查' : '配置 AI'}
        </button>
      </div>
    </section>
  )
}

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
          <button className="icon-button" onClick={props.onClose}>
            ×
          </button>
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
          <button className="ghost-button" onClick={props.onExport}>
            保存备份到电脑
          </button>
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
          <button className="ghost-button danger-text" onClick={props.onDelete}>
            删除当前
          </button>
          <button className="primary-button" onClick={props.onCreate}>
            ＋ 新建 Prompt
          </button>
        </div>
      </section>
    </div>
  )
}

const providerNames: Record<AiSettings['provider'], string> = {
  'openai-compatible': 'OpenAI-compatible',
  anthropic: 'Anthropic',
}

export function AiSheet(props: {
  mode: 'menu' | 'settings'
  settings: AiSettings
  busy: boolean
  testState: 'idle' | 'ok' | 'error'
  error: string | null
  onSettings(settings: AiSettings): void
  onProvider(provider: AiSettings['provider']): void
  onClose(): void
  onOpenSettings(): void
  onSave(): void
  onTest(): void
  onAction(action: 'draft_acceptance' | 'ambiguity' | 'structure'): void
}) {
  if (props.mode === 'menu') {
    return (
      <div className="overlay" onMouseDown={props.onClose}>
        <section className="sheet" onMouseDown={(event) => event.stopPropagation()}>
          <div className="sheet-head">
            <div>
              <strong>AI 辅助</strong>
              <small>
                {providerNames[props.settings.provider]} · {props.settings.model}
              </small>
            </div>
            <button className="icon-button" onClick={props.onClose}>
              ×
            </button>
          </div>
          <div className="ai-status-card">
            <span className={props.settings.enabled ? 'status-dot status-dot--ready' : 'status-dot'} />
            <div>
              <strong>{props.settings.enabled ? 'AI 已就绪' : 'AI 已关闭'}</strong>
              <small>
                {props.settings.completionEnabled
                  ? '内联补全已开启；其他 AI 动作仍需主动触发。'
                  : '内联补全未开启；AI 动作只在你主动触发后调用。'}
              </small>
            </div>
          </div>
          <div className="ai-menu">
            <AiMenuButton
              title="检查当前 Prompt 的歧义"
              detail="发送当前 Prompt；结果只作为建议"
              disabled={!props.settings.enabled || props.busy}
              onClick={() => props.onAction('ambiguity')}
            />
            <AiMenuButton
              title="补充验收标准"
              detail="生成可接受/忽略的验收标准建议"
              disabled={!props.settings.enabled || props.busy}
              onClick={() => props.onAction('draft_acceptance')}
            />
            <AiMenuButton
              title="给出结构整理建议"
              detail="只建议结构，不整篇重写"
              disabled={!props.settings.enabled || props.busy}
              onClick={() => props.onAction('structure')}
            />
          </div>
          {props.error && <div className="form-error">{props.error}</div>}
          <div className="sheet-actions">
            <span />
            <button className="ghost-button" onClick={props.onOpenSettings}>
              设置
            </button>
          </div>
        </section>
      </div>
    )
  }

  const requiresVerification = props.settings.enabled && !props.settings.configured
  return (
    <div className="overlay" onMouseDown={props.onClose}>
      <section className="sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <strong>AI 辅助设置</strong>
            <small>配置属于扩展偏好，不进入 PromptDocument</small>
          </div>
          <button className="icon-button" onClick={props.onClose}>
            ×
          </button>
        </div>
        <div className="ai-status-card">
          <span className={props.settings.configured ? 'status-dot status-dot--ready' : 'status-dot'} />
          <div>
            <strong>{props.settings.configured ? '连接已验证' : '尚未验证 AI 连接'}</strong>
            <small>
              {requiresVerification
                ? '先测试连接成功，再保存启用 AI 或打开内联补全。'
                : '编辑、Compiler、Copy 和本地检查不依赖 AI。'}
            </small>
          </div>
        </div>
        <div className="settings-form">
          <label className="toggle-row">
            <span>
              <strong>启用 AI 辅助</strong>
              <small>关闭后不会调用 Provider</small>
            </span>
            <input
              type="checkbox"
              checked={props.settings.enabled}
              onChange={(event) => props.onSettings({ ...props.settings, enabled: event.target.checked })}
            />
          </label>
          <label className="toggle-row">
            <span>
              <strong>编辑器内联补全</strong>
              <small>默认关闭。开启后光标停顿会出现灰色续写；Tab 接受，Esc 忽略。</small>
            </span>
            <input
              type="checkbox"
              checked={props.settings.completionEnabled}
              disabled={!props.settings.enabled || !props.settings.configured}
              onChange={(event) =>
                props.onSettings({ ...props.settings, completionEnabled: event.target.checked })
              }
            />
          </label>
          <label>
            <span>Provider</span>
            <select
              value={props.settings.provider}
              onChange={(event) => props.onProvider(event.target.value as AiSettings['provider'])}
            >
              <option value="openai-compatible">OpenAI-compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label>
            <span>Model</span>
            <input
              value={props.settings.model}
              onChange={(event) => props.onSettings({ ...props.settings, model: event.target.value })}
              placeholder="填写实际模型 ID"
            />
          </label>
          <label>
            <span>API Base URL</span>
            <input
              value={props.settings.baseUrl}
              onChange={(event) => props.onSettings({ ...props.settings, baseUrl: event.target.value })}
            />
          </label>
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={props.settings.apiKey}
              onChange={(event) => props.onSettings({ ...props.settings, apiKey: event.target.value })}
              placeholder="保存在 chrome.storage.local"
            />
          </label>
          <label>
            <span>默认发送范围</span>
            <select
              value={props.settings.scope}
              onChange={(event) =>
                props.onSettings({ ...props.settings, scope: event.target.value as AiSettings['scope'] })
              }
            >
              <option value="selection">仅选中文字</option>
              <option value="context">选区 + 当前 Prompt 上下文</option>
            </select>
          </label>
        </div>
        <div className="privacy-note">
          API Key 与 PromptDocument 分离保存在本地扩展存储中；Chrome 本地存储并非加密保险库。普通 AI 动作只在你主动触发时发送内容；只有连接验证成功并另外开启“编辑器内联补全”后，编辑停顿才会自动请求短补全。
        </div>
        {props.testState === 'ok' && (
          <div className="form-success">连接测试成功，现在可以保存配置并选择是否开启补全。</div>
        )}
        {props.testState === 'error' && props.error && <div className="form-error">{props.error}</div>}
        <div className="sheet-actions">
          <button className="ghost-button" disabled={props.busy} onClick={props.onTest}>
            {props.busy ? '测试中…' : '测试连接'}
          </button>
          <button
            className="primary-button"
            disabled={props.busy || requiresVerification}
            onClick={props.onSave}
          >
            {requiresVerification ? '先测试连接' : '保存配置'}
          </button>
        </div>
      </section>
    </div>
  )
}

function AiMenuButton(props: {
  title: string
  detail: string
  disabled: boolean
  onClick(): void
}) {
  return (
    <button className="ai-menu-item" disabled={props.disabled} onClick={props.onClick}>
      <span className="ai-menu-item__icon">◇</span>
      <span>
        <strong>{props.title}</strong>
        <small>{props.detail}</small>
      </span>
      <span>›</span>
    </button>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export const aiActionLabels: Record<AiAction, string> = {
  clarify: '改清楚',
  shorten: '缩短',
  split_constraints: '拆成约束',
  draft_acceptance: '补充验收标准',
  ambiguity: '检查歧义',
  structure: '结构建议',
  complete: '内联补全',
}
