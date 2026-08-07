export interface WebPromptAdapter {
  id: string
  canHandle(url: URL): boolean
  findComposer(): HTMLElement | null
}
