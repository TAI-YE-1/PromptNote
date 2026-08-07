import { findGenericEditable } from './editable'
import type { WebPromptAdapter } from './types'

export const genericWebAdapter: WebPromptAdapter = {
  id: 'generic-web-input',
  canHandle(url) {
    return url.protocol === 'http:' || url.protocol === 'https:'
  },
  findComposer() {
    return findGenericEditable()
  },
}
