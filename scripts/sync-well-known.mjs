import fs from 'node:fs'
import path from 'node:path'

function resolveVariant() {
  // Manual override (useful locally or if you want explicit control)
  const manual = process.env.WELL_KNOWN_VARIANT
  if (manual === 'dev' || manual === 'staging' || manual === 'prod') return manual

  // On Vercel, you can detect the git branch via system env vars
  // (e.g. VERCEL_GIT_COMMIT_REF) :contentReference[oaicite:3]{index=3}
  const branch = process.env.VERCEL_GIT_COMMIT_REF || ''

  // Production branch should map to prod well-known
  if (branch === 'main') return 'prod'

  // Common patterns:
  if (branch === 'staging') return 'staging'
  if (branch.startsWith('release/')) return 'staging' // release candidates behave like staging by default

  // Everything else (dev branch, feature branches) => dev well-known
  return 'dev'
}

const variant = resolveVariant()

const repoRoot = process.cwd()
const srcDir = path.join(repoRoot, 'well-known', variant, '.well-known')
const outDir = path.join(repoRoot, 'public', '.well-known')

if (!fs.existsSync(srcDir)) {
  console.error(`[well-known] Missing source directory: ${srcDir}`)
  process.exit(1)
}

// Replace output folder contents each run
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
fs.cpSync(srcDir, outDir, { recursive: true })

console.log(`[well-known] Synced "${variant}" -> public/.well-known`)
