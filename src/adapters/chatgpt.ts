import type { WebPromptAdapter } from './types'

export const chatGptAdapter: WebPromptAdapter = {
  id: 'chatgpt',
  canHandle(url) {
    return url.hostname === 'chatgpt.com' || url.hostname === 'chat.openai.com'
  },
  findComposer() {
    return (
      document.querySelector<HTMLElement>('#prompt-textarea') ??
      document.querySelector<HTMLTextAreaElement>('textarea[data-id="root"]') ??
      null
    )
  },
}
