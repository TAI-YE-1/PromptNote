import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

describe('release manifest', () => {
  it('keeps the published extension version and least-privilege fixed permissions', () => {
    expect(manifest.version).toBe('1.0.0')
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

  it('keeps the store short description concise', () => {
    expect(manifest.description.length).toBeGreaterThan(20)
    expect(manifest.description.length).toBeLessThanOrEqual(132)
  })
})
