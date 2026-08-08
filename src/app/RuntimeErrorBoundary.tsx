import { Component, type ErrorInfo, type ReactNode } from 'react'

interface RuntimeErrorBoundaryProps {
  children: ReactNode
}

interface RuntimeErrorBoundaryState {
  error: Error | null
}

export class RuntimeErrorBoundary extends Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  state: RuntimeErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PromptNote runtime error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="boot-state">
        <div>
          <strong>PromptNote 运行失败</strong>
          <p>{this.state.error.message || '发生未知运行时错误。'}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            重新打开
          </button>
        </div>
      </div>
    )
  }
}
