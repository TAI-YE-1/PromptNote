import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RuntimeErrorBoundary } from './app/RuntimeErrorBoundary'
import './styles.css'
import './ui/components.css'

const root = document.getElementById('root')
if (!root) throw new Error('PromptNote desktop root element missing.')

createRoot(root).render(
  <StrictMode>
    <RuntimeErrorBoundary>
      <div className="boot-state">Desktop shell 已启动；本地数据层将在 P3 接入。</div>
    </RuntimeErrorBoundary>
  </StrictMode>,
)
