import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PromptNoteApp } from './app/PromptNoteApp'
import { RuntimeErrorBoundary } from './app/RuntimeErrorBoundary'
import { DesktopAiTransport } from './platform/desktop/aiTransport'
import { DesktopPreferencesRepository } from './platform/desktop/preferencesRepository'
import { DesktopPromptRepository } from './platform/desktop/promptRepository'
import { DesktopSecretStore } from './platform/desktop/secretStore'
import './styles.css'
import './ui/components.css'

const root = document.getElementById('root')
if (!root) throw new Error('PromptNote desktop root element missing.')

const promptRepository = new DesktopPromptRepository()
const preferencesRepository = new DesktopPreferencesRepository()
const secretStore = new DesktopSecretStore()
const aiTransport = new DesktopAiTransport()

createRoot(root).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <PromptNoteApp
        promptRepository={promptRepository}
        preferencesRepository={preferencesRepository}
        secretStore={secretStore}
        aiTransport={aiTransport}
      />
    </RuntimeErrorBoundary>
  </StrictMode>,
)
