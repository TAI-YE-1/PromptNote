import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

describe('release manifest', () => {
  it('keeps the release extension version and least-privilege fixed permissions', () => {
    expect(manifest.version).toBe('1.0.1')
    expect(manifest.permissions).toEqual(['storage', 'sidePanel'])
  })

  it('allows public AI providers only over HTTPS while preserving local loopback development', () => {
    expect(manifest.optional_host_permissions).toEqual([
      'https://*/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ])
    expect(manifest.optional_host_permissions).not.toContain('http://*/*')
  })

  it('ships the PromptNote brand icon for extension and toolbar surfaces', () => {
    expect(manifest.icons).toEqual({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    })
    expect(manifest.action.default_icon).toEqual({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
    })
  })

  it('keeps the store short description concise', () => {
    expect(manifest.description.length).toBeGreaterThan(20)
    expect(manifest.description.length).toBeLessThanOrEqual(132)
  })
})
