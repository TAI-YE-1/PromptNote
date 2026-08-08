import type { AiAction, AiSettings } from '../ai/types'
import { AiAdvancedSettings } from './AiAdvancedSettings'

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
              <small>{providerNames[props.settings.provider]} · {props.settings.model}</small>
            </div>
            <button className="icon-button" onClick={props.onClose}>×</button>
          </div>
          <div className="ai-status-card">
            <span className={props.settings.enabled ? 'status-dot status-dot--ready' : 'status-dot'} />
            <div>
              <strong>{props.settings.enabled ? 'AI 已就绪' : 'AI 已关闭'}</strong>
              <small>
                {props.settings.completionEnabled
                  ? `内联补全已开启 · ${props.settings.completionContextChars} 字符 · ${props.settings.completionDelayMs}ms`
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
            <button className="ghost-button" onClick={props.onOpenSettings}>设置</button>
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
          <button className="icon-button" onClick={props.onClose}>×</button>
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
          <AiAdvancedSettings settings={props.settings} onSettings={props.onSettings} />
        </div>
        <div className="privacy-note">
          API Key 与 PromptDocument 分离保存在本地扩展存储中；Chrome 本地存储并非加密保险库。普通 AI 动作只在你主动触发时发送内容；只有连接验证成功并另外开启“编辑器内联补全”后，编辑停顿才会自动请求短补全。高级参数和自定义 AI 指令同样只保存在本地设置中。
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

export const aiActionLabels: Record<AiAction, string> = {
  clarify: '改清楚',
  shorten: '缩短',
  split_constraints: '拆成约束',
  draft_acceptance: '补充验收标准',
  ambiguity: '检查歧义',
  structure: '结构建议',
  complete: '内联补全',
}
