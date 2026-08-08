import { useEffect, useState } from 'react'
import {
  COMPLETION_CONTEXT_MAX,
  COMPLETION_CONTEXT_MIN,
  COMPLETION_CONTEXT_PRESETS,
  COMPLETION_DELAY_MAX_MS,
  COMPLETION_DELAY_MIN_MS,
  COMPLETION_DELAY_PRESETS,
} from '../ai/completionTuning'
import { AI_ACTION_INSTRUCTIONS } from '../ai/instructions'
import type { AiAction, AiSettings } from '../ai/types'
import './aiAdvancedSettings.css'

const ACTION_OPTIONS: Array<{ action: AiAction; label: string }> = [
  { action: 'clarify', label: '改清楚' },
  { action: 'shorten', label: '缩短' },
  { action: 'split_constraints', label: '拆成约束' },
  { action: 'draft_acceptance', label: '补充验收标准' },
  { action: 'ambiguity', label: '检查歧义' },
  { action: 'structure', label: '结构建议' },
  { action: 'complete', label: '内联补全' },
]

export function AiAdvancedSettings(props: {
  settings: AiSettings
  onSettings(settings: AiSettings): void
}) {
  const [instructionAction, setInstructionAction] = useState<AiAction>('complete')

  function updateInstruction(action: AiAction, value: string) {
    const instructionOverrides = { ...props.settings.instructionOverrides }
    if (value) instructionOverrides[action] = value
    else delete instructionOverrides[action]
    props.onSettings({ ...props.settings, instructionOverrides })
  }

  return (
    <details className="ai-advanced">
      <summary>高级 · 补全与 AI 指令</summary>
      <div className="ai-advanced__body">
        <div className="ai-advanced__group">
          <div className="ai-advanced__title">补全性能</div>
          <PresetNumberField
            label="补全上下文"
            value={props.settings.completionContextChars}
            presets={COMPLETION_CONTEXT_PRESETS}
            presetLabels={{ 160: '短 · 160', 320: '中 · 320', 640: '长 · 640' }}
            min={COMPLETION_CONTEXT_MIN}
            max={COMPLETION_CONTEXT_MAX}
            unit="字符"
            onChange={(completionContextChars) =>
              props.onSettings({ ...props.settings, completionContextChars })
            }
          />
          <PresetNumberField
            label="触发延迟"
            value={props.settings.completionDelayMs}
            presets={COMPLETION_DELAY_PRESETS}
            presetLabels={{ 150: '快 · 150ms', 300: '平衡 · 300ms', 600: '稳 · 600ms' }}
            min={COMPLETION_DELAY_MIN_MS}
            max={COMPLETION_DELAY_MAX_MS}
            unit="ms"
            onChange={(completionDelayMs) => props.onSettings({ ...props.settings, completionDelayMs })}
          />
          <small className="ai-advanced__hint">
            预设只是快捷值；选择“自定义”可以直接输入。上下文越短通常响应越快，延迟越低请求越积极。
          </small>
        </div>

        <div className="ai-advanced__group">
          <div className="ai-advanced__title">AI 指令模板</div>
          <label className="ai-advanced__field">
            <span>功能</span>
            <select
              value={instructionAction}
              onChange={(event) => setInstructionAction(event.target.value as AiAction)}
            >
              {ACTION_OPTIONS.map(({ action, label }) => (
                <option key={action} value={action}>{label}</option>
              ))}
            </select>
          </label>
          <label className="ai-advanced__field">
            <span>自定义指令</span>
            <textarea
              rows={5}
              maxLength={4_000}
              value={props.settings.instructionOverrides[instructionAction] ?? ''}
              placeholder={AI_ACTION_INSTRUCTIONS[instructionAction]}
              onChange={(event) => updateInstruction(instructionAction, event.target.value)}
            />
          </label>
          <div className="ai-advanced__instruction-footer">
            <small>留空时使用内置默认；这里只覆盖该功能的任务指令，不改变 Provider 连接配置。</small>
            <button
              type="button"
              className="ghost-button"
              disabled={!props.settings.instructionOverrides[instructionAction]}
              onClick={() => updateInstruction(instructionAction, '')}
            >
              恢复默认
            </button>
          </div>
        </div>
      </div>
    </details>
  )
}

function PresetNumberField(props: {
  label: string
  value: number
  presets: readonly number[]
  presetLabels: Record<number, string>
  min: number
  max: number
  unit: string
  onChange(value: number): void
}) {
  const valueIsPreset = props.presets.includes(props.value)
  const [customMode, setCustomMode] = useState(!valueIsPreset)

  useEffect(() => {
    if (!customMode && !props.presets.includes(props.value)) setCustomMode(true)
  }, [customMode, props.presets, props.value])

  return (
    <div className="ai-advanced__field">
      <span>{props.label}</span>
      <div className="ai-advanced__tuning-row">
        <select
          aria-label={`${props.label}预设`}
          value={customMode ? 'custom' : String(props.value)}
          onChange={(event) => {
            if (event.target.value === 'custom') {
              setCustomMode(true)
              return
            }
            setCustomMode(false)
            props.onChange(Number(event.target.value))
          }}
        >
          {props.presets.map((preset) => (
            <option key={preset} value={preset}>{props.presetLabels[preset]}</option>
          ))}
          <option value="custom">自定义</option>
        </select>
        {customMode && (
          <label className="ai-advanced__custom-number">
            <input
              type="number"
              min={props.min}
              max={props.max}
              step={1}
              value={props.value}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (Number.isInteger(next)) props.onChange(next)
              }}
            />
            <span>{props.unit}</span>
          </label>
        )}
      </div>
      {customMode && <small>允许范围：{props.min}–{props.max} {props.unit}</small>}
    </div>
  )
}
