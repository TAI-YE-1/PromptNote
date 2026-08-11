export const AI_API_KEY_SECRET = 'ai.apiKey' as const
export type SecretName = typeof AI_API_KEY_SECRET

export interface SecretStore {
  get(name: SecretName): Promise<string | null>
  set(name: SecretName, value: string): Promise<void>
  remove(name: SecretName): Promise<void>
}
