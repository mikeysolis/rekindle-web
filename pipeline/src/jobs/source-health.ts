import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import { DurableStoreRepository, type SourceHealthRow } from "../durable-store/repository.js"
import { listSources } from "../sources/registry.js"

export interface SourceHealthSignal {
  code: string
  severity: "info" | "warn" | "critical"
  message: string
}

export interface SourceHealthEntry {
  sourceKey: string
  displayName: string
  state: string
  approvedForProd: boolean
  cadence: string | null
  lastRunAt: string | null
  lastSuccessAt: string | null
  rollingPromotionRate30d: number | null
  rollingFailureRate30d: number | null
  healthScore: number | null
  consecutiveFailures: number
  lastRunStatus: string | null
  lastError: string | null
  signals: SourceHealthSignal[]
}

export interface SourceHealthResult {
  generatedAt: string
  sources: SourceHealthEntry[]
  unregisteredSources: string[]
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const asInteger = (value: unknown, fallback = 0): number => {
  const numeric = asFiniteNumber(value)
  if (numeric === null) return fallback
  return Math.max(0, Math.round(numeric))
}

const readHealthMeta = (row: SourceHealthRow) => {
  const health = asRecord(asRecord(row.metadataJson).health)

  return {
    healthScore: asFiniteNumber(health.health_score),
    consecutiveFailures: asInteger(health.consecutive_failures),
    lastRunStatus:
      typeof health.last_run_status === "string" && health.last_run_status.trim().length > 0
        ? health.last_run_status
        : null,
    lastError:
      typeof health.last_error === "string" && health.last_error.trim().length > 0
        ? health.last_error
        : null,
  }
}

const buildSignals = (
  row: SourceHealthRow,
  healthMeta: ReturnType<typeof readHealthMeta>
): SourceHealthSignal[] => {
  const signals: SourceHealthSignal[] = []

  if (!row.lastRunAt) {
    signals.push({
      code: "never_run",
      severity: "warn",
      message: "No run has been recorded for this source.",
    })
  }

  if (!row.lastSuccessAt) {
    signals.push({
      code: "no_success",
      severity: "warn",
      message: "No successful run has been recorded for this source.",
    })
  }

  if ((row.rollingFailureRate30d ?? 0) >= 0.35) {
    signals.push({
      code: "high_failure_rate",
      severity: "critical",
      message: `Rolling failure rate is ${(100 * (row.rollingFailureRate30d ?? 0)).toFixed(1)}%.`,
    })
  }

  if ((row.rollingPromotionRate30d ?? 0) > 0 && (row.rollingPromotionRate30d ?? 0) < 0.05) {
    signals.push({
      code: "low_yield",
      severity: "warn",
      message: `Rolling promotion proxy is ${(100 * (row.rollingPromotionRate30d ?? 0)).toFixed(1)}%.`,
    })
  }

  if (healthMeta.consecutiveFailures >= 3) {
    signals.push({
      code: "consecutive_failures",
      severity: "critical",
      message: `Consecutive failed runs: ${healthMeta.consecutiveFailures}.`,
    })
  }

  if ((healthMeta.healthScore ?? 100) < 40) {
    signals.push({
      code: "low_health_score",
      severity: "warn",
      message: `Health score is ${Math.round(healthMeta.healthScore ?? 0)} / 100.`,
    })
  }

  if ((row.state === "paused" || row.state === "retired") && row.approvedForProd) {
    signals.push({
      code: "inactive_source",
      severity: "info",
      message: `Source is ${row.state} and not expected to run on schedule.`,
    })
  }

  if (signals.length === 0) {
    signals.push({
      code: "healthy",
      severity: "info",
      message: "No immediate failure or yield risk signals detected.",
    })
  }

  return signals
}

export const buildSourceHealthEntry = (row: SourceHealthRow): SourceHealthEntry => {
  const healthMeta = readHealthMeta(row)

  return {
    sourceKey: row.sourceKey,
    displayName: row.displayName,
    state: row.state,
    approvedForProd: row.approvedForProd,
    cadence: row.cadence,
    lastRunAt: row.lastRunAt,
    lastSuccessAt: row.lastSuccessAt,
    rollingPromotionRate30d: row.rollingPromotionRate30d,
    rollingFailureRate30d: row.rollingFailureRate30d,
    healthScore: healthMeta.healthScore,
    consecutiveFailures: healthMeta.consecutiveFailures,
    lastRunStatus: healthMeta.lastRunStatus,
    lastError: healthMeta.lastError,
    signals: buildSignals(row, healthMeta),
  }
}

export async function sourceHealth(sourceKey?: string): Promise<SourceHealthResult> {
  const config = loadConfig()
  assertIngestConfig(config)

  const logger = createLogger(config.logLevel, "source-health")

  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )

  const durable = new DurableStoreRepository(ingestClient, logger)
  const rows = await durable.listSourceHealthRows(sourceKey ? [sourceKey] : undefined)

  if (sourceKey && rows.length === 0) {
    throw new Error(`No source registry row found for source key \"${sourceKey}\"`)
  }

  const registeredKeys = new Set(rows.map((row) => row.sourceKey))
  const unregisteredSources = sourceKey
    ? []
    : listSources()
        .map((source) => source.key)
        .filter((key) => !registeredKeys.has(key))

  return {
    generatedAt: new Date().toISOString(),
    sources: rows.map(buildSourceHealthEntry),
    unregisteredSources,
  }
}
