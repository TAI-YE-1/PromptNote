import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface ReleaseManifest {
  version: string
  description: string
  permissions: string[]
  optional_host_permissions: string[]
}

function loadManifest(): ReleaseManifest {
  return JSON.parse(
    readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'),
  ) as ReleaseManifest
}

describe('release manifest', () => {
  it('keeps the published extension version and least-privilege fixed permissions', () => {
    const manifest = loadManifest()

    expect(manifest.version).toBe('1.0.0')
    expect(manifest.permissions).toEqual(['storage', 'sidePanel'])
  })

  it('allows public AI providers only over HTTPS while preserving local loopback development', () => {
    const manifest = loadManifest()

    expect(manifest.optional_host_permissions).toEqual([
      'https://*/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ])
    expect(manifest.optional_host_permissions).not.toContain('http://*/*')
  })

  it('keeps the store short description concise', () => {
    const manifest = loadManifest()

    expect(manifest.description.length).toBeGreaterThan(20)
    expect(manifest.description.length).toBeLessThanOrEqual(132)
  })
})
