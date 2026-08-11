import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: http.fetch }))

import { DesktopAiTransport } from '../src/platform/desktop/aiTransport'

describe('DesktopAiTransport', () => {
  beforeEach(() => {
    http.fetch.mockReset()
  })

  it('allows HTTPS providers on default or custom ports', async () => {
    const transport = new DesktopAiTransport()

    await expect(transport.ensureAccess('https://api.openai.com/v1')).resolves.toBe(true)
    await expect(transport.ensureAccess('https://gateway.example.com:8443/v1')).resolves.toBe(true)
  })

  it('allows local HTTP providers only on localhost and 127.0.0.1', async () => {
    const transport = new DesktopAiTransport()

    await expect(transport.ensureAccess('http://localhost:11434/v1')).resolves.toBe(true)
    await expect(transport.ensureAccess('http://127.0.0.1:1234/v1')).resolves.toBe(true)
    await expect(transport.ensureAccess('http://192.168.1.10:11434/v1')).resolves.toBe(false)
    await expect(transport.ensureAccess('http://provider.example.com/v1')).resolves.toBe(false)
  })

  it('rejects malformed and non-HTTP provider URLs', async () => {
    const transport = new DesktopAiTransport()

    await expect(transport.ensureAccess('not a url')).resolves.toBe(false)
    await expect(transport.ensureAccess('file:///tmp/model')).resolves.toBe(false)
  })

  it('delegates allowed requests to the official Tauri HTTP fetch', async () => {
    const transport = new DesktopAiTransport()
    const response = new Response('ok', { status: 200 })
    const controller = new AbortController()
    http.fetch.mockResolvedValueOnce(response)

    await expect(
      transport.request('https://provider.example.com/v1/chat/completions', {
        method: 'POST',
        body: '{}',
        signal: controller.signal,
      }),
    ).resolves.toBe(response)

    expect(http.fetch).toHaveBeenCalledWith('https://provider.example.com/v1/chat/completions', {
      method: 'POST',
      body: '{}',
      signal: controller.signal,
    })
  })

  it('rejects insecure remote requests even if a caller skips ensureAccess', async () => {
    const transport = new DesktopAiTransport()

    await expect(transport.request('http://provider.example.com/v1/messages', {})).rejects.toThrow(
      'Desktop AI 仅允许 HTTPS 或 localhost / 127.0.0.1 的 HTTP Provider。',
    )
    expect(http.fetch).not.toHaveBeenCalled()
  })
})
