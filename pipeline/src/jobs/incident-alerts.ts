import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import {
  DurableStoreRepository,
  type SourceHealthRow,
  type SourceRejectionRateTrend,
} from "../durable-store/repository.js"
import { parseCadenceIntervalMs } from "./runtime-controls.js"

export type IncidentSeverity = "sev1" | "sev2" | "sev3"
export type IncidentCode =
  | "zero_yield_anomaly"
  | "failure_spike"
  | "schedule_miss"
  | "rejection_rate_surge"
  | "compliance_failure"

export interface IncidentRoutingExpectation {
  channels: string[]
  ackWithinMinutes: number
  mitigateWithinMinutes: number
}

export interface IncidentAlert {
  id: string
  sourceKey: string
  displayName: string
  code: IncidentCode
  severity: IncidentSeverity
  summary: string
  routing: IncidentRoutingExpectation
  generatedAt: string
  evidenceBundle: Record<string, unknown>
}

export interface IncidentAlertsResult {
  generatedAt: string
  sourceCount: number
  alertCount: number
  alertsBySeverity: Record<IncidentSeverity, number>
  alerts: IncidentAlert[]
}

const INCIDENT_ALERT_VERSION = "ing051_v1"
const MAX_ALERT_HISTORY = 30
const REJECTION_SURGE_WINDOW_DAYS = 7

const ROUTING_BY_SEVERITY: Record<IncidentSeverity, IncidentRoutingExpectation> = {
  sev1: {
    channels: ["ingestion-oncall", "compliance-owner", "product-owner"],
    ackWithinMinutes: 15,
    mitigateWithinMinutes: 60,
  },
  sev2: {
    channels: ["ingestion-oncall", "source-owner"],
    ackWithinMinutes: 60,
    mitigateWithinMinutes: 240,
  },
  sev3: {
    channels: ["source-owner"],
    ackWithinMinutes: 240,
    mitigateWithinMinutes: 1440,
  },
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

const buildAlertId = (sourceKey: string, code: IncidentCode, generatedAt: string): string => {
  const stamp = generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14)
  return `${sourceKey}:${code}:${stamp}`
}

const pushAlert = (params: {
  output: IncidentAlert[]
  generatedAt: string
  sourceKey: string
  displayName: string
  code: IncidentCode
  severity: IncidentSeverity
  summary: string
  evidenceBundle: Record<string, unknown>
}): void => {
  params.output.push({
    id: buildAlertId(params.sourceKey, params.code, params.generatedAt),
    sourceKey: params.sourceKey,
    displayName: params.displayName,
    code: params.code,
    severity: params.severity,
    summary: params.summary,
    routing: ROUTING_BY_SEVERITY[params.severity],
    generatedAt: params.generatedAt,
    evidenceBundle: {
      version: INCIDENT_ALERT_VERSION,
      source_key: params.sourceKey,
      code: params.code,
      severity: params.severity,
      summary: params.summary,
      generated_at: params.generatedAt,
      ...params.evidenceBundle,
    },
  })
}

export const evaluateIncidentAlertsForSource = (params: {
  row: SourceHealthRow
  nowIso: string
  rejectionTrend?: SourceRejectionRateTrend
}): IncidentAlert[] => {
  const alerts: IncidentAlert[] = []
  const nowMs = Date.parse(params.nowIso)
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now()
  const row = params.row
  const metadataJson = asRecord(row.metadataJson)
  const health = asRecord(metadataJson.health)
  const compliance = asRecord(metadataJson.compliance)

  const lastRunCandidateCount = asInteger(health.last_run_candidate_count, 0)
  const lastRunCuratedCandidateCount = asInteger(health.last_run_curated_candidate_count, 0)
  const consecutiveFailures = asInteger(health.consecutive_failures, 0)
  const observedRuns = asInteger(health.observed_runs, 0)
  const rollingFailureRate = row.rollingFailureRate30d ?? 0
  const rollingPromotionRate = row.rollingPromotionRate30d ?? 0

  if (
    row.state === "active" &&
    row.approvedForProd &&
    rollingPromotionRate >= 0.1 &&
    lastRunCandidateCount >= 5 &&
    lastRunCuratedCandidateCount === 0
  ) {
    pushAlert({
      output: alerts,
      generatedAt: params.nowIso,
      sourceKey: row.sourceKey,
      displayName: row.displayName,
      code: "zero_yield_anomaly",
      severity: "sev2",
      summary: "Zero curated yield on historically productive source.",
      evidenceBundle: {
        rolling_promotion_rate_30d: rollingPromotionRate,
        last_run_candidate_count: lastRunCandidateCount,
        last_run_curated_candidate_count: lastRunCuratedCandidateCount,
        state: row.state,
        approved_for_prod: row.approvedForProd,
      },
    })
  }

  if (
    row.state === "active" &&
    row.approvedForProd &&
    (consecutiveFailures >= 3 || (rollingFailureRate >= 0.5 && observedRuns >= 6))
  ) {
    const severity: IncidentSeverity =
      consecutiveFailures >= 5 || rollingFailureRate >= 0.8 ? "sev1" : "sev2"
    pushAlert({
      output: alerts,
      generatedAt: params.nowIso,
      sourceKey: row.sourceKey,
      displayName: row.displayName,
      code: "failure_spike",
      severity,
      summary: "Failure spike exceeds runtime reliability thresholds.",
      evidenceBundle: {
        consecutive_failures: consecutiveFailures,
        observed_runs: observedRuns,
        rolling_failure_rate_30d: rollingFailureRate,
        last_run_status: health.last_run_status ?? null,
        last_error: health.last_error ?? null,
      },
    })
  }

  if (row.state === "active" && row.approvedForProd && row.cadence) {
    const intervalMs = parseCadenceIntervalMs(row.cadence)
    if (intervalMs !== null) {
      if (!row.lastRunAt) {
        pushAlert({
          output: alerts,
          generatedAt: params.nowIso,
          sourceKey: row.sourceKey,
          displayName: row.displayName,
          code: "schedule_miss",
          severity: "sev2",
          summary: "Scheduled source has no recorded run timestamp.",
          evidenceBundle: {
            cadence: row.cadence,
            last_run_at: row.lastRunAt,
            expected_interval_ms: intervalMs,
          },
        })
      } else {
        const lastRunMs = Date.parse(row.lastRunAt)
        if (Number.isFinite(lastRunMs)) {
          const overdueMs = safeNowMs - (lastRunMs + intervalMs)
          if (overdueMs >= intervalMs) {
            pushAlert({
              output: alerts,
              generatedAt: params.nowIso,
              sourceKey: row.sourceKey,
              displayName: row.displayName,
              code: "schedule_miss",
              severity: "sev2",
              summary: "Source appears to have missed at least one scheduled run.",
              evidenceBundle: {
                cadence: row.cadence,
                last_run_at: row.lastRunAt,
                expected_next_run_at: new Date(lastRunMs + intervalMs).toISOString(),
                overdue_ms: overdueMs,
              },
            })
          }
        }
      }
    }
  }

  const rejectionTrend = params.rejectionTrend
  if (rejectionTrend) {
    const recentRate = rejectionTrend.recentRejectionRate
    const priorRate = rejectionTrend.priorRejectionRate
    if (
      recentRate !== null &&
      priorRate !== null &&
      rejectionTrend.recentReviewedCount >= 20 &&
      rejectionTrend.priorReviewedCount >= 20 &&
      recentRate >= priorRate + 0.1 &&
      recentRate >= priorRate * 1.5
    ) {
      pushAlert({
        output: alerts,
        generatedAt: params.nowIso,
        sourceKey: row.sourceKey,
        displayName: row.displayName,
        code: "rejection_rate_surge",
        severity: "sev2",
        summary: "Editorial rejection rate increased sharply versus prior window.",
        evidenceBundle: {
          window_days: REJECTION_SURGE_WINDOW_DAYS,
          recent_reviewed_count: rejectionTrend.recentReviewedCount,
          recent_rejected_count: rejectionTrend.recentRejectedCount,
          recent_rejection_rate: recentRate,
          prior_reviewed_count: rejectionTrend.priorReviewedCount,
          prior_rejected_count: rejectionTrend.priorRejectedCount,
          prior_rejection_rate: priorRate,
          delta_rejection_rate: recentRate - priorRate,
        },
      })
    }
  }

  if (compliance.last_pre_run_check_status === "failed") {
    const lastCheck = asRecord(compliance.last_pre_run_check)
    const severityRaw = lastCheck.severity
    const severity: IncidentSeverity =
      severityRaw === "critical" ? "sev1" : severityRaw === "warn" ? "sev2" : "sev2"
    const reasonCodes = Array.isArray(lastCheck.reason_codes)
      ? lastCheck.reason_codes.filter((entry): entry is string => typeof entry === "string")
      : []
    pushAlert({
      output: alerts,
      generatedAt: params.nowIso,
      sourceKey: row.sourceKey,
      displayName: row.displayName,
      code: "compliance_failure",
      severity,
      summary: "Recent compliance pre-run failure requires operator triage.",
      evidenceBundle: {
        compliance_check: lastCheck,
        reason_codes: reasonCodes,
      },
    })
  }

  const dedupedByCode = new Map<IncidentCode, IncidentAlert>()
  for (const alert of alerts) {
    const existing = dedupedByCode.get(alert.code)
    if (!existing) {
      dedupedByCode.set(alert.code, alert)
      continue
    }

    const existingRank = existing.severity === "sev1" ? 3 : existing.severity === "sev2" ? 2 : 1
    const candidateRank = alert.severity === "sev1" ? 3 : alert.severity === "sev2" ? 2 : 1
    if (candidateRank > existingRank) {
      dedupedByCode.set(alert.code, alert)
    }
  }

  return Array.from(dedupedByCode.values())
}

export const mergeIncidentAlertMetadata = (params: {
  metadataJson: Record<string, unknown>
  alerts: IncidentAlert[]
  nowIso: string
}): Record<string, unknown> => {
  const metadataJson = asRecord(params.metadataJson)
  const incidents = asRecord(metadataJson.incidents)
  const historyRaw = incidents.alert_history
  const priorHistory = Array.isArray(historyRaw)
    ? historyRaw.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
    : []

  const newEntries = params.alerts.map((alert) => alert.evidenceBundle)
  const nextHistory = [...newEntries, ...priorHistory].slice(0, MAX_ALERT_HISTORY)

  const severityCounts = params.alerts.reduce<Record<IncidentSeverity, number>>(
    (acc, alert) => {
      acc[alert.severity] += 1
      return acc
    },
    { sev1: 0, sev2: 0, sev3: 0 }
  )

  return {
    ...metadataJson,
    incidents: {
      ...incidents,
      version: INCIDENT_ALERT_VERSION,
      last_alert_run_at: params.nowIso,
      last_alert_count: params.alerts.length,
      last_alerts: params.alerts.map((alert) => ({
        id: alert.id,
        code: alert.code,
        severity: alert.severity,
        summary: alert.summary,
        routing: alert.routing,
        generated_at: alert.generatedAt,
      })),
      alert_severity_counts: severityCounts,
      alert_history: nextHistory,
    },
  }
}

export async function incidentAlerts(sourceKey?: string): Promise<IncidentAlertsResult> {
  const config = loadConfig()
  assertIngestConfig(config)

  const logger = createLogger(config.logLevel, "incident-alerts")
  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )
  const durable = new DurableStoreRepository(ingestClient, logger)
  const generatedAt = new Date().toISOString()
  const rows = await durable.listSourceHealthRows(sourceKey ? [sourceKey] : undefined)

  if (sourceKey && rows.length === 0) {
    throw new Error(`No source registry row found for source key "${sourceKey}"`)
  }

  const sourceKeys = rows.map((row) => row.sourceKey)
  const rejectionTrends = await durable.listSourceRejectionRateTrends({
    sourceKeys,
    windowDays: REJECTION_SURGE_WINDOW_DAYS,
    nowIso: generatedAt,
  })
  const rejectionTrendBySource = new Map<string, SourceRejectionRateTrend>()
  for (const trend of rejectionTrends) {
    rejectionTrendBySource.set(trend.sourceKey, trend)
  }

  const alerts: IncidentAlert[] = []
  for (const row of rows) {
    const rowAlerts = evaluateIncidentAlertsForSource({
      row,
      nowIso: generatedAt,
      rejectionTrend: rejectionTrendBySource.get(row.sourceKey),
    })

    if (rowAlerts.length === 0) {
      continue
    }

    alerts.push(...rowAlerts)

    const metadataJson = mergeIncidentAlertMetadata({
      metadataJson: row.metadataJson,
      alerts: rowAlerts,
      nowIso: generatedAt,
    })

    try {
      await durable.updateSourceRegistryRuntime(row.sourceKey, {
        metadataJson,
      })
    } catch (error) {
      logger.warn("Failed to persist incident alert metadata", {
        sourceKey: row.sourceKey,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    for (const alert of rowAlerts) {
      const message = `${alert.severity.toUpperCase()} ${alert.code}: ${alert.summary}`
      if (alert.severity === "sev1") {
        logger.error(message, alert.evidenceBundle)
      } else if (alert.severity === "sev2") {
        logger.warn(message, alert.evidenceBundle)
      } else {
        logger.info(message, alert.evidenceBundle)
      }
    }
  }

  const alertsBySeverity = alerts.reduce<Record<IncidentSeverity, number>>(
    (acc, alert) => {
      acc[alert.severity] += 1
      return acc
    },
    { sev1: 0, sev2: 0, sev3: 0 }
  )

  return {
    generatedAt,
    sourceCount: rows.length,
    alertCount: alerts.length,
    alertsBySeverity,
    alerts,
  }
}
