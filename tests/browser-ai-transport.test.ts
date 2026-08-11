import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserAiTransport } from '../src/platform/browser/aiTransport'

afterEach(() => vi.unstubAllGlobals())

describe('BrowserAiTransport', () => {
  it('reuses an existing optional host permission without prompting again', async () => {
    const contains = vi.fn(async () => true)
    const request = vi.fn(async () => true)
    vi.stubGlobal('chrome', { permissions: { contains, request } })

    await expect(new BrowserAiTransport().ensureAccess('https://example.com/v1')).resolves.toBe(true)
    expect(contains).toHaveBeenCalledWith({ origins: ['https://example.com/*'] })
    expect(request).not.toHaveBeenCalled()
  })

  it('requests exactly the configured provider origin when permission is missing', async () => {
    const contains = vi.fn(async () => false)
    const request = vi.fn(async () => true)
    vi.stubGlobal('chrome', { permissions: { contains, request } })

    await expect(new BrowserAiTransport().ensureAccess('https://example.com/v1/')).resolves.toBe(true)
    expect(request).toHaveBeenCalledWith({ origins: ['https://example.com/*'] })
  })

  it('delegates the actual request to the browser fetch implementation', async () => {
    const response = new Response('ok', { status: 200 })
    const fetchMock = vi.fn(async () => response)
    vi.stubGlobal('fetch', fetchMock)

    const init: RequestInit = { method: 'POST', body: 'payload' }
    await expect(new BrowserAiTransport().request('https://example.com/v1/test', init)).resolves.toBe(response)
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/v1/test', init)
  })
})
