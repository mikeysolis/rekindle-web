import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const ENV_FILE_PATHS = [
  ".env.local",
  ".env",
  "pipeline/.env",
]

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) {
    return null
  }

  const separatorIndex = trimmed.indexOf("=")
  if (separatorIndex <= 0) {
    return null
  }

  const rawKey = trimmed.slice(0, separatorIndex).trim()
  if (!KEY_PATTERN.test(rawKey)) {
    return null
  }

  let value = trimmed.slice(separatorIndex + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [rawKey, value]
}

function loadEnvFile(path: string): void {
  const absolutePath = resolve(process.cwd(), path)
  if (!existsSync(absolutePath)) {
    return
  }

  const content = readFileSync(absolutePath, "utf8")
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const parsed = parseEnvLine(line)
    if (!parsed) {
      continue
    }

    const [key, value] = parsed
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

export function loadLocalEnvFiles(): void {
  for (const path of ENV_FILE_PATHS) {
    loadEnvFile(path)
  }
}
