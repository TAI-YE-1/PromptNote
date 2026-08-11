import { useEffect, useState } from 'react'
import {
  setPanelAlwaysOnTop,
  toggleOrbEnabled,
  type ShellSnapshot,
} from './platform/desktop/shell'
import {
  getStartupSnapshot,
  setAutostart,
  type StartupSnapshot,
} from './platform/desktop/startup'

interface DesktopSettingsProps {
  shell: ShellSnapshot | null
  onClose(): void
}

export function DesktopSettings({ shell, onClose }: DesktopSettingsProps) {
  const [startup, setStartup] = useState<StartupSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    void getStartupSnapshot()
      .then((snapshot) => {
        if (!disposed) setStartup(snapshot)
      })
      .catch((loadError) => {
        if (!disposed) setError(messageOf(loadError))
      })
    return () => {
      disposed = true
    }
  }, [])

  async function changeAutostart(enabled: boolean) {
    setBusy(true)
    setError(null)
    try {
      const actual = await setAutostart(enabled)
      setStartup((current) => (current ? { ...current, autostartEnabled: actual } : current))
    } catch (changeError) {
      setError(messageOf(changeError))
      try {
        setStartup(await getStartupSnapshot())
      } catch {
        // Preserve the original actionable OS error.
      }
    } finally {
      setBusy(false)
    }
  }

  async function runShellSetting(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (changeError) {
      setError(messageOf(changeError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="desktop-settings-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="desktop-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="desktop-settings__header">
          <div>
            <div className="desktop-settings__eyebrow">Windows Desktop</div>
            <h2 id="desktop-settings-title">设置</h2>
          </div>
          <button type="button" className="desktop-settings__close" onClick={onClose} aria-label="关闭设置">
            ×
          </button>
        </header>

        <div className="desktop-settings__rows">
          <SettingRow
            title="全局快捷键"
            detail={startup?.shortcutLabel ?? 'Ctrl + Alt + P'}
            status={
              startup
                ? startup.shortcutRegistered
                  ? '已注册'
                  : `注册失败${startup.shortcutError ? `：${startup.shortcutError}` : ''}`
                : '正在读取…'
            }
            error={Boolean(startup && !startup.shortcutRegistered)}
          />

          <ToggleRow
            title="开机启动"
            detail="默认关闭；开启后登录 Windows 时进入悬浮球 / 托盘，不弹出主窗口。"
            checked={startup?.autostartEnabled ?? false}
            disabled={busy || !startup}
            onChange={(enabled) => void changeAutostart(enabled)}
          />

          <ToggleRow
            title="显示悬浮球"
            detail="关闭后仍可从托盘或全局快捷键打开 PromptNote。"
            checked={shell?.orbEnabled ?? false}
            disabled={busy || !shell}
            onChange={() => void runShellSetting(toggleOrbEnabled)}
          />

          <ToggleRow
            title="侧边面板保持置顶"
            detail="只影响 Docked Panel；完整窗口始终使用普通 Windows 层级。"
            checked={shell?.panelAlwaysOnTop ?? false}
            disabled={busy || !shell}
            onChange={(enabled) => void runShellSetting(() => setPanelAlwaysOnTop(enabled))}
          />
        </div>

        {error && <div className="desktop-settings__error">{error}</div>}
      </section>
    </div>
  )
}

function SettingRow({
  title,
  detail,
  status,
  error = false,
}: {
  title: string
  detail: string
  status: string
  error?: boolean
}) {
  return (
    <div className="desktop-settings__row">
      <div>
        <div className="desktop-settings__label">{title}</div>
        <div className="desktop-settings__detail">{detail}</div>
      </div>
      <div className={error ? 'desktop-settings__status desktop-settings__status--error' : 'desktop-settings__status'}>
        {status}
      </div>
    </div>
  )
}

function ToggleRow({
  title,
  detail,
  checked,
  disabled,
  onChange,
}: {
  title: string
  detail: string
  checked: boolean
  disabled: boolean
  onChange(checked: boolean): void
}) {
  return (
    <label className="desktop-settings__row desktop-settings__row--toggle">
      <div>
        <div className="desktop-settings__label">{title}</div>
        <div className="desktop-settings__detail">{detail}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
