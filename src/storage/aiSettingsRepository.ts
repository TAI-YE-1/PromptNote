import { normalizeCompletionContextChars, normalizeCompletionDelayMs } from '../ai/completionTuning'
import type { AiAction, AiInstructionOverrides, AiSettings } from '../ai/types'

const AI_SETTINGS_KEY = 'promptnote.aiSettings.v1'
const AI_ACTIONS: AiAction[] = [
  'clarify',
  'shorten',
  'split_constraints',
  'draft_acceptance',
  'ambiguity',
  'structure',
  'complete',
]

export const defaultAiSettings: AiSettings = {
  enabled: true,
  configured: false,
  completionEnabled: false,
  completionContextChars: 320,
  completionDelayMs: 300,
  completionModel: '',
  instructionOverrides: {},
  provider: 'openai-compatible',
  model: '',
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  scope: 'selection',
}

export interface AiSettingsRepository {
  load(): Promise<AiSettings>
  save(settings: AiSettings): Promise<void>
}

export class ChromeAiSettingsRepository implements AiSettingsRepository {
  async load(): Promise<AiSettings> {
    const result = await chrome.storage.local.get(AI_SETTINGS_KEY)
    const value = result[AI_SETTINGS_KEY]
    if (!value || typeof value !== 'object') return defaultAiSettings

    const stored = value as Partial<AiSettings>
    const legacyUnverified = !Object.hasOwn(stored, 'completionEnabled')
    return {
      ...defaultAiSettings,
      ...stored,
      configured: legacyUnverified ? false : Boolean(stored.configured),
      completionEnabled: legacyUnverified ? false : Boolean(stored.completionEnabled),
      completionContextChars: normalizeCompletionContextChars(stored.completionContextChars),
      completionDelayMs: normalizeCompletionDelayMs(stored.completionDelayMs),
      completionModel: typeof stored.completionModel === 'string' ? stored.completionModel.slice(0, 200) : '',
      instructionOverrides: normalizeInstructionOverrides(stored.instructionOverrides),
    }
  }

  async save(settings: AiSettings): Promise<void> {
    await chrome.storage.local.set({ [AI_SETTINGS_KEY]: settings })
  }
}

function normalizeInstructionOverrides(value: unknown): AiInstructionOverrides {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const result: AiInstructionOverrides = {}
  for (const action of AI_ACTIONS) {
    const instruction = source[action]
    if (typeof instruction === 'string' && instruction.trim()) result[action] = instruction.slice(0, 4_000)
  }
  return result
}
