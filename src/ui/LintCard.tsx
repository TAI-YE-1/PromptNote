import type { PromptLintFinding } from '../ai/types'
import './floatingPanels.css'

export function LintCard(props: {
  findings: PromptLintFinding[]
  aiReady: boolean
  onDeepCheck(): void
}) {
  return (
    <section className="lint-card lint-card--floating">
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
