import type { LogLevel } from "../core/logger.js"

export type SnapshotMode = "local" | "supabase"

const ENV_CONTRACT_DOC_PATH = "docs/specs/ingestion/14_environment_and_secrets_contract.md"

export interface PipelineConfig {
  ingestSupabaseUrl?: string
  ingestSupabaseServiceRoleKey?: string
  appSupabaseUrl?: string
  appSupabaseServiceRoleKey?: string
  ingestSnapshotMode: SnapshotMode
  ingestSnapshotLocalDir: string
  ingestSnapshotBucket: string
  reconciliationSpikeThreshold: number
  reconciliationPageSize: number
  complianceRobotsTtlDays: number
  complianceTermsTtlDays: number
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

const readPositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

export function loadConfig(): PipelineConfig {
  return {
    ingestSupabaseUrl: process.env.INGEST_SUPABASE_URL,
    ingestSupabaseServiceRoleKey: process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY,
    appSupabaseUrl: process.env.APP_SUPABASE_URL,
    appSupabaseServiceRoleKey: process.env.APP_SUPABASE_SERVICE_ROLE_KEY,
    ingestSnapshotMode: readSnapshotMode(process.env.INGEST_SNAPSHOT_MODE),
    ingestSnapshotLocalDir: process.env.INGEST_SNAPSHOT_LOCAL_DIR ?? "./snapshots",
    ingestSnapshotBucket:
      process.env.INGEST_SNAPSHOT_BUCKET ?? "rekindle-ingestion-snapshots",
    reconciliationSpikeThreshold: readPositiveInteger(
      process.env.INGEST_RECONCILIATION_SPIKE_THRESHOLD,
      25
    ),
    reconciliationPageSize: readPositiveInteger(process.env.INGEST_RECONCILIATION_PAGE_SIZE, 500),
    complianceRobotsTtlDays: readPositiveInteger(
      process.env.INGEST_COMPLIANCE_ROBOTS_TTL_DAYS,
      7
    ),
    complianceTermsTtlDays: readPositiveInteger(
      process.env.INGEST_COMPLIANCE_TERMS_TTL_DAYS,
      30
    ),
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

  if (process.env.APP_SUPABASE_KEY) {
    throw new Error(
      "Forbidden env var APP_SUPABASE_KEY is set. Use APP_SUPABASE_SERVICE_ROLE_KEY only. See " +
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

export function assertPromotionReconciliationConfig(
  config: PipelineConfig
): asserts config is PipelineConfig & {
  ingestSupabaseUrl: string
  ingestSupabaseServiceRoleKey: string
  appSupabaseUrl: string
  appSupabaseServiceRoleKey: string
} {
  assertIngestConfig(config)

  if (!config.appSupabaseUrl || !config.appSupabaseServiceRoleKey) {
    throw new Error(
      "Missing app Supabase credentials for promotion reconciliation. Set APP_SUPABASE_URL and APP_SUPABASE_SERVICE_ROLE_KEY. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }

  if (config.appSupabaseUrl === config.ingestSupabaseUrl) {
    throw new Error(
      "APP_SUPABASE_URL must not match INGEST_SUPABASE_URL. App and ingestion must use separate Supabase projects. See " +
        ENV_CONTRACT_DOC_PATH
    )
  }
}
