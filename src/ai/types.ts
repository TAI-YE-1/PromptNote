export type AiProviderId = 'openai-compatible' | 'anthropic'
export type AiScope = 'selection' | 'context'
export type AiAction =
  | 'clarify'
  | 'shorten'
  | 'split_constraints'
  | 'draft_acceptance'
  | 'ambiguity'
  | 'structure'
  | 'complete'
export type SuggestionAiAction = Exclude<AiAction, 'complete'>

export interface AiSettings {
  enabled: boolean
  configured: boolean
  completionEnabled: boolean
  provider: AiProviderId
  model: string
  baseUrl: string
  apiKey: string
  scope: AiScope
}

export interface AiRequest {
  action: AiAction
  content: string
  surroundingContext?: string
}

export interface PromptSuggestion {
  id: string
  action: SuggestionAiAction
  label: string
  sourceText: string
  replacementText: string
  sourceRevision: number
  target: 'selection' | 'append-section' | 'advisory'
  sectionKind?: 'acceptance'
  range?: { from: number; to: number }
}

export interface PromptLintFinding {
  id: string
  severity: 'info' | 'warning'
  message: string
  detail?: string
  source: 'local' | 'ai'
}

export interface AiProvider {
  testConnection(settings: AiSettings): Promise<void>
  generate(settings: AiSettings, request: AiRequest, signal?: AbortSignal): Promise<string>
}
