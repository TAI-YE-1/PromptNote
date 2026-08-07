import { readFile } from 'node:fs/promises'

const lockfileUrl = new URL('../package-lock.json', import.meta.url)
const lockfile = JSON.parse(await readFile(lockfileUrl, 'utf8'))

if (lockfile.lockfileVersion !== 3 || !lockfile.packages || typeof lockfile.packages !== 'object') {
  throw new Error('package-lock.json must be npm lockfileVersion 3 with package metadata.')
}

const entries = Object.entries(lockfile.packages)
  .filter(([path]) => path !== '')
  .map(([path, metadata]) => ({
    id: `${packageNameFromPath(path)}@${metadata.version ?? 'unknown'}`,
    path,
    license: normalizeLicense(metadata.license),
    dev: metadata.dev === true,
  }))
  .sort((a, b) => a.id.localeCompare(b.id))

const missing = entries.filter((entry) => !entry.license)
const blocked = entries.filter((entry) => entry.license && isBlocked(entry.license))
const review = entries.filter((entry) => entry.license && needsReview(entry.license))
const licenseCounts = new Map()

for (const entry of entries) {
  const license = entry.license || 'MISSING'
  licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1)
}

console.log(`Audited ${entries.length} locked dependency packages across all platforms.`)
console.log('License summary:')
for (const [license, count] of [...licenseCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${license}: ${count}`)
}

if (review.length) {
  console.log('Licenses requiring explicit release review:')
  for (const entry of review) {
    console.log(`  ${entry.id}: ${entry.license}${entry.dev ? ' (dev/build)' : ''}`)
  }
}

if (missing.length || blocked.length) {
  if (missing.length) {
    console.error('Locked dependencies with missing license metadata:')
    for (const entry of missing) console.error(`  ${entry.id} (${entry.path})`)
  }
  if (blocked.length) {
    console.error('Locked dependencies with licenses outside PromptNote V1 policy:')
    for (const entry of blocked) console.error(`  ${entry.id}: ${entry.license}`)
  }
  process.exitCode = 1
}

function packageNameFromPath(path) {
  const marker = 'node_modules/'
  const lastMarker = path.lastIndexOf(marker)
  return lastMarker >= 0 ? path.slice(lastMarker + marker.length) : path
}

function normalizeLicense(value) {
  return typeof value === 'string' ? value.trim() : ''
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
