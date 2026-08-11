export type AiTransportResponse = Pick<Response, 'ok' | 'status' | 'headers' | 'body' | 'text'>

export interface AiTransport {
  ensureAccess(baseUrl: string): Promise<boolean>
  request(url: string, init: RequestInit): Promise<AiTransportResponse>
}
