import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import type { AiTransport, AiTransportResponse } from '../../ai/transport'

function isAllowedDesktopAiUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol === 'https:') return true
  if (url.protocol !== 'http:') return false
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}

export class DesktopAiTransport implements AiTransport {
  async ensureAccess(baseUrl: string): Promise<boolean> {
    return isAllowedDesktopAiUrl(baseUrl)
  }

  request(url: string, init: RequestInit): Promise<AiTransportResponse> {
    if (!isAllowedDesktopAiUrl(url)) {
      return Promise.reject(new Error('Desktop AI 仅允许 HTTPS 或 localhost / 127.0.0.1 的 HTTP Provider。'))
    }
    return tauriFetch(url, init)
  }
}
