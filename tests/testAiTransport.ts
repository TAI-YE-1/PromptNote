import type { AiTransport } from '../src/ai/transport'

export const fetchAiTransport: AiTransport = {
  async ensureAccess() {
    return true
  },
  request(url, init) {
    return fetch(url, init)
  },
}
