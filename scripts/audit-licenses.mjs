import { access, readFile, readdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const packageRoot = new URL('../node_modules/', import.meta.url)
const packages = new Map()

await scanNodeModules(packageRoot.pathname)

if (packages.size === 0) {
  throw new Error('License audit found no installed dependencies. Run npm install first.')
}

const entries = [...packages.values()].sort((a, b) => a.id.localeCompare(b.id))
const missing = entries.filter((entry) => !entry.license)
const blocked = entries.filter((entry) => entry.license && isBlocked(entry.license))
const review = entries.filter((entry) => entry.license && needsReview(entry.license))
const licenseCounts = new Map()

for (const entry of entries) {
  const license = entry.license || 'MISSING'
  licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1)
}

console.log(`Audited ${entries.length} installed dependency packages.`)
console.log('License summary:')
for (const [license, count] of [...licenseCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${license}: ${count}`)
}

if (review.length) {
  console.log('Licenses requiring explicit release review:')
  for (const entry of review) console.log(`  ${entry.id}: ${entry.license}`)
}

if (missing.length || blocked.length) {
  if (missing.length) {
    console.error('Dependencies with missing license metadata:')
    for (const entry of missing) console.error(`  ${entry.id}`)
  }
  if (blocked.length) {
    console.error('Dependencies with licenses outside PromptNote V1 policy:')
    for (const entry of blocked) console.error(`  ${entry.id}: ${entry.license}`)
  }
  process.exitCode = 1
}

async function scanNodeModules(directory) {
  if (!(await exists(directory))) return
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '.bin') continue
    if (entry.name.startsWith('@')) {
      const scopeDirectory = join(directory, entry.name)
      for (const scoped of await readdir(scopeDirectory, { withFileTypes: true })) {
        if (scoped.isDirectory()) await inspectPackage(join(scopeDirectory, scoped.name))
      }
      continue
    }
    await inspectPackage(join(directory, entry.name))
  }
}

async function inspectPackage(directory) {
  const manifestPath = join(directory, 'package.json')
  if (!(await exists(manifestPath))) return

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (typeof manifest.name === 'string' && typeof manifest.version === 'string') {
    const id = `${manifest.name}@${manifest.version}`
    packages.set(id, {
      id,
      license: normalizeLicense(manifest.license ?? manifest.licenses),
    })
  }

  await scanNodeModules(join(directory, 'node_modules'))
}

function normalizeLicense(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item : item?.type)
      .filter((item) => typeof item === 'string' && item.trim())
      .join(' OR ')
  }
  if (value && typeof value === 'object' && typeof value.type === 'string') return value.type.trim()
  return ''
}

function isBlocked(license) {
  return [
    /\bAGPL(?:-|\b)/i,
    /\bGPL(?:-|\b)/i,
    /\bSSPL(?:-|\b)/i,
    /\bBUSL(?:-|\b)/i,
    /Commons Clause/i,
  ].some((pattern) => pattern.test(license))
}

function needsReview(license) {
  return [
    /\bLGPL(?:-|\b)/i,
    /\bMPL(?:-|\b)/i,
    /\bEPL(?:-|\b)/i,
    /\bCDDL(?:-|\b)/i,
  ].some((pattern) => pattern.test(license))
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}
