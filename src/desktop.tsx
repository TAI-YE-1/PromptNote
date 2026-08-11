import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  PromptNoteApp,
  type PromptNoteHostCommandRequest,
} from './app/PromptNoteApp'
import { DesktopSettings } from './DesktopSettings'
import { RuntimeErrorBoundary } from './app/RuntimeErrorBoundary'
import { DesktopAiTransport } from './platform/desktop/aiTransport'
import { DesktopPreferencesRepository } from './platform/desktop/preferencesRepository'
import { DesktopPromptRepository } from './platform/desktop/promptRepository'
import { DesktopSecretStore } from './platform/desktop/secretStore'
import {
  collapseDockedPanel,
  getShellSnapshot,
  onHostCommand,
  onShellSnapshot,
  setPanelAlwaysOnTop,
  showFullWindow,
  type ShellSnapshot,
} from './platform/desktop/shell'
import './styles.css'
import './ui/components.css'
import './desktop-shell.css'

const root = document.getElementById('root')
if (!root) throw new Error('PromptNote desktop root element missing.')

const promptRepository = new DesktopPromptRepository()
const preferencesRepository = new DesktopPreferencesRepository()
const secretStore = new DesktopSecretStore()
const aiTransport = new DesktopAiTransport()

function DesktopRoot() {
  const hostCommandSequence = useRef(0)
  const [shell, setShell] = useState<ShellSnapshot | null>(null)
  const [hostCommand, setHostCommand] = useState<PromptNoteHostCommandRequest | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shellError, setShellError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let unlistenShell: (() => void) | null = null
    let unlistenHostCommand: (() => void) | null = null

    void getShellSnapshot()
      .then((snapshot) => {
        if (!disposed) setShell(snapshot)
      })
      .catch((error) => {
        if (!disposed) setShellError(messageOf(error))
      })

    void onShellSnapshot((snapshot) => {
      if (!disposed) {
        setShell(snapshot)
        setShellError(null)
      }
    }).then((stop) => {
      if (disposed) stop()
      else unlistenShell = stop
    })

    void onHostCommand((command) => {
      if (disposed) return
      if (command === 'settings') {
        setSettingsOpen(true)
        return
      }
      hostCommandSequence.current += 1
      setHostCommand({ id: hostCommandSequence.current, command: 'new-prompt' })
    }).then((stop) => {
      if (disposed) stop()
      else unlistenHostCommand = stop
    })

    return () => {
      disposed = true
      unlistenShell?.()
      unlistenHostCommand?.()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.desktopShellMode = shell?.mode ?? 'loading'
  }, [shell?.mode])

  async function runShellAction(action: () => Promise<void>) {
    setShellError(null)
    try {
      await action()
    } catch (error) {
      setShellError(messageOf(error))
    }
  }

  return (
    <>
      <PromptNoteApp
        promptRepository={promptRepository}
        preferencesRepository={preferencesRepository}
        secretStore={secretStore}
        aiTransport={aiTransport}
        hostCommand={hostCommand}
      />

      {shell?.mode === 'docked-panel' && (
        <div className="desktop-panel-controls" aria-label="Desktop Panel 控制">
          <button
            type="button"
            className="desktop-panel-control"
            aria-pressed={shell.panelAlwaysOnTop}
            title={shell.panelAlwaysOnTop ? '关闭置顶' : '保持置顶'}
            onClick={() =>
              void runShellAction(() => setPanelAlwaysOnTop(!shell.panelAlwaysOnTop))
            }
          >
            {shell.panelAlwaysOnTop ? '●' : '○'}
          </button>
          <button
            type="button"
            className="desktop-panel-control"
            title="展开为完整窗口"
            onClick={() => void runShellAction(showFullWindow)}
          >
            ↗
          </button>
          <button
            type="button"
            className="desktop-panel-control"
            title="收起"
            onClick={() => void runShellAction(collapseDockedPanel)}
          >
            —
          </button>
        </div>
      )}

      {settingsOpen && <DesktopSettings shell={shell} onClose={() => setSettingsOpen(false)} />}
      {shellError && <div className="desktop-shell-error">Desktop shell：{shellError}</div>}
    </>
  )
}

createRoot(root).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <DesktopRoot />
    </RuntimeErrorBoundary>
  </StrictMode>,
)

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
