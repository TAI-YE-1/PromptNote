import { normalizeCompletionContextChars, normalizeCompletionDelayMs } from '../ai/completionTuning'
import type { AiAction, AiInstructionOverrides, AiSettings } from '../ai/types'

const AI_ACTIONS: AiAction[] = [
  'clarify',
  'shorten',
  'split_constraints',
  'draft_acceptance',
  'ambiguity',
  'structure',
  'complete',
]

export type AiPreferences = Omit<AiSettings, 'apiKey'>

export const defaultAiPreferences: AiPreferences = {
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
  scope: 'selection',
}

export const defaultAiSettings: AiSettings = {
  ...defaultAiPreferences,
  apiKey: '',
}

export interface PreferencesRepository {
  load(): Promise<AiPreferences>
  save(preferences: AiPreferences): Promise<void>
}

export function parseStoredAiPreferences(value: unknown): AiPreferences {
  if (!value || typeof value !== 'object') return defaultAiPreferences

  const stored = value as Partial<AiSettings>
  const legacyUnverified = !Object.hasOwn(stored, 'completionEnabled')
  return {
    enabled: stored.enabled ?? defaultAiPreferences.enabled,
    configured: legacyUnverified ? false : Boolean(stored.configured),
    completionEnabled: legacyUnverified ? false : Boolean(stored.completionEnabled),
    completionContextChars: normalizeCompletionContextChars(stored.completionContextChars),
    completionDelayMs: normalizeCompletionDelayMs(stored.completionDelayMs),
    completionModel: typeof stored.completionModel === 'string' ? stored.completionModel.slice(0, 200) : '',
    instructionOverrides: normalizeInstructionOverrides(stored.instructionOverrides),
    provider: stored.provider ?? defaultAiPreferences.provider,
    model: stored.model ?? defaultAiPreferences.model,
    baseUrl: stored.baseUrl ?? defaultAiPreferences.baseUrl,
    scope: stored.scope ?? defaultAiPreferences.scope,
  }
}

export function toAiPreferences(settings: AiSettings): AiPreferences {
  return {
    enabled: settings.enabled,
    configured: settings.configured,
    completionEnabled: settings.completionEnabled,
    completionContextChars: settings.completionContextChars,
    completionDelayMs: settings.completionDelayMs,
    completionModel: settings.completionModel,
    instructionOverrides: settings.instructionOverrides,
    provider: settings.provider,
    model: settings.model,
    baseUrl: settings.baseUrl,
    scope: settings.scope,
  }
}

export function withAiSecret(preferences: AiPreferences, apiKey: string | null): AiSettings {
  return { ...preferences, apiKey: apiKey ?? '' }
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
