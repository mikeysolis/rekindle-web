import type { LogLevel } from "../core/logger.js"

export type SnapshotMode = "local" | "supabase"

const ENV_CONTRACT_DOC_PATH = "docs/specs/ingestion/14_environment_and_secrets_contract.md"

export interface PipelineConfig {
  ingestSupabaseUrl?: string
  ingestSupabaseServiceRoleKey?: string
  ingestSnapshotMode: SnapshotMode
  ingestSnapshotLocalDir: string
  ingestSnapshotBucket: string
  logLevel: LogLevel
  defaultLocale: string
}

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"]

const readLogLevel = (value: string | undefined): LogLevel => {
  if (!value) return "info"
  const normalized = value.toLowerCase()
  if (!LOG_LEVELS.includes(normalized as LogLevel)) {
    return "info"
  }
  return normalized as LogLevel
}

const readSnapshotMode = (value: string | undefined): SnapshotMode => {
  if (value?.toLowerCase() === "supabase") return "supabase"
  return "local"
}

export function loadConfig(): PipelineConfig {
  return {
    ingestSupabaseUrl: process.env.INGEST_SUPABASE_URL,
    ingestSupabaseServiceRoleKey: process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY,
    ingestSnapshotMode: readSnapshotMode(process.env.INGEST_SNAPSHOT_MODE),
    ingestSnapshotLocalDir: process.env.INGEST_SNAPSHOT_LOCAL_DIR ?? "./snapshots",
    ingestSnapshotBucket:
      process.env.INGEST_SNAPSHOT_BUCKET ?? "rekindle-ingestion-snapshots",
    logLevel: readLogLevel(process.env.INGEST_LOG_LEVEL ?? process.env.LOG_LEVEL),
    defaultLocale: process.env.INGEST_DEFAULT_LOCALE ?? process.env.DEFAULT_LOCALE ?? "en",
  }
}

export function assertIngestConfig(
  config: PipelineConfig
): asserts config is PipelineConfig & {
  ingestSupabaseUrl: string
  ingestSupabaseServiceRoleKey: string
} {
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Forbidden env var NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set. Service role keys must never be public. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }

  if (process.env.INGEST_SUPABASE_KEY) {
    throw new Error(
      "Forbidden env var INGEST_SUPABASE_KEY is set. Use INGEST_SUPABASE_SERVICE_ROLE_KEY only. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (appUrl && config.ingestSupabaseUrl && appUrl === config.ingestSupabaseUrl) {
    throw new Error(
      "INGEST_SUPABASE_URL must not match NEXT_PUBLIC_SUPABASE_URL. App and ingestion must use separate Supabase projects. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }

  if (!config.ingestSupabaseUrl || !config.ingestSupabaseServiceRoleKey) {
    throw new Error(
      "Missing ingestion Supabase credentials. Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }
}
