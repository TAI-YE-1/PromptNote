import type { AiTransport, AiTransportResponse } from '../../ai/transport'

export class BrowserAiTransport implements AiTransport {
  async ensureAccess(baseUrl: string): Promise<boolean> {
    const url = new URL(baseUrl)
    const originPattern = `${url.origin}/*`
    if (await chrome.permissions.contains({ origins: [originPattern] })) return true
    return chrome.permissions.request({ origins: [originPattern] })
  }

  request(url: string, init: RequestInit): Promise<AiTransportResponse> {
    return fetch(url, init)
  }
}
