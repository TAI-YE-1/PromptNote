import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PromptNoteApp } from './app/PromptNoteApp'
import { RuntimeErrorBoundary } from './app/RuntimeErrorBoundary'
import { BrowserAiTransport } from './platform/browser/aiTransport'
import { ChromeAiSettingsStore } from './platform/browser/aiSettingsStore'
import { ChromePromptRepository } from './platform/browser/promptRepository'
import './styles.css'
import './ui/components.css'

const root = document.getElementById('root')
if (!root) throw new Error('PromptNote root element missing.')

const promptRepository = new ChromePromptRepository()
const aiSettingsStore = new ChromeAiSettingsStore()
const aiTransport = new BrowserAiTransport()

createRoot(root).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <PromptNoteApp
        promptRepository={promptRepository}
        preferencesRepository={aiSettingsStore}
        secretStore={aiSettingsStore}
        aiTransport={aiTransport}
      />
    </RuntimeErrorBoundary>
  </StrictMode>,
)
