import type { PromptSuggestion } from '../ai/types'

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
