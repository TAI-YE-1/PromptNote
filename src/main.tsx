import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PromptNoteApp } from './app/PromptNoteApp'
import './styles.css'
import './ui/components.css'

const root = document.getElementById('root')
if (!root) throw new Error('PromptNote root element missing.')

createRoot(root).render(
  <StrictMode>
    <PromptNoteApp />
  </StrictMode>,
)
