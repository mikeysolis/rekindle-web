import { parseCadenceIntervalMs } from "./runtime-controls.js"

export const LIFECYCLE_AUTOMATION_VERSION = "ing032_v1"

const DEGRADED_MIN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_DEGRADED_CADENCE = "FREQ=WEEKLY;INTERVAL=1;BYDAY=SUN;BYHOUR=2;BYMINUTE=0"
const MAX_ALERT_HISTORY = 20

export interface LifecycleAutomationInput {
  sourceKey: string
  state: string
  cadence: string | null
  skippedByCadence: boolean
  finalRunStatus: "success" | "partial" | "failed"
  rollingFailureRate30d: number | null
  rollingPromotionRate30d: number | null
  metadataJson: Record<string, unknown>
  nowIso: string
}

export interface LifecycleAutomationDecision {
  shouldTransitionToDegraded: boolean
  shouldDowngradeCadence: boolean
  degradedCadence: string | null
  triggerCodes: string[]
  reason: string | null
  alertSeverity: "warn" | "critical" | null
  evidenceBundle: Record<string, unknown> | null
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

const parseCadenceTokens = (cadence: string): Map<string, string> => {
  const tokens = new Map<string, string>()
  for (const token of cadence.split(";")) {
    const [rawKey, rawValue] = token.split("=", 2)
    const key = rawKey?.trim().toUpperCase()
    const value = rawValue?.trim().toUpperCase()
    if (!key || !value) continue
    tokens.set(key, value)
  }
  return tokens
}

const deriveDegradedCadence = (cadence: string | null): string => {
  if (!cadence || cadence.trim().length === 0) {
    return DEFAULT_DEGRADED_CADENCE
  }

  const tokens = parseCadenceTokens(cadence)
  const byDay = tokens.get("BYDAY") ?? "SUN"
  const byHour = tokens.get("BYHOUR") ?? "2"
  const byMinute = tokens.get("BYMINUTE") ?? "0"

  return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay};BYHOUR=${byHour};BYMINUTE=${byMinute}`
}

const shouldDowngradeCadence = (cadence: string | null): boolean => {
  if (!cadence || cadence.trim().length === 0) {
    return true
  }

  const intervalMs = parseCadenceIntervalMs(cadence)
  if (intervalMs === null) {
    return true
  }

  return intervalMs < DEGRADED_MIN_INTERVAL_MS
}

const readHealthSnapshot = (metadataJson: Record<string, unknown>) => {
  const health = asRecord(asRecord(metadataJson).health)

  return {
    healthScore: asFiniteNumber(health.health_score),
    consecutiveFailures: asInteger(health.consecutive_failures),
    consecutiveLowQualityRuns: asInteger(health.consecutive_low_quality_runs),
    observedRuns: asInteger(health.observed_runs),
    observedFailedRuns: asInteger(health.observed_failed_runs),
    lastRunCandidateCount: asInteger(health.last_run_candidate_count),
    lastRunCuratedCandidateCount: asInteger(health.last_run_curated_candidate_count),
  }
}

const buildRecommendedActions = (triggerCodes: string[]): string[] => {
  const actions: string[] = []

  if (triggerCodes.includes("consecutive_failures")) {
    actions.push("Investigate extractor breakage on latest failed pages.")
  }
  if (triggerCodes.includes("rolling_failure_rate_spike")) {
    actions.push("Reduce crawl scope and validate network/source stability.")
  }
  if (triggerCodes.includes("quality_drop")) {
    actions.push("Review recent candidates and tune quality/extractor heuristics.")
  }

  if (actions.length === 0) {
    actions.push("Monitor source health and strategy performance.")
  }

  return actions
}

export const evaluateLifecycleAutomation = (
  input: LifecycleAutomationInput
): LifecycleAutomationDecision => {
  if (input.skippedByCadence) {
    return {
      shouldTransitionToDegraded: false,
      shouldDowngradeCadence: false,
      degradedCadence: null,
      triggerCodes: [],
      reason: null,
      alertSeverity: null,
      evidenceBundle: null,
    }
  }

  const health = readHealthSnapshot(input.metadataJson)
  const triggerCodes: string[] = []

  if (health.consecutiveFailures >= 3) {
    triggerCodes.push("consecutive_failures")
  }

  if ((input.rollingFailureRate30d ?? 0) >= 0.5 && health.observedRuns >= 6) {
    triggerCodes.push("rolling_failure_rate_spike")
  }

  const likelyQualityDrop =
    health.consecutiveLowQualityRuns >= 3 ||
    ((input.rollingPromotionRate30d ?? 1) <= 0.03 &&
      health.observedRuns >= 6 &&
      health.lastRunCandidateCount >= 5 &&
      health.lastRunCuratedCandidateCount === 0)
  if (likelyQualityDrop) {
    triggerCodes.push("quality_drop")
  }

  const shouldTransitionToDegraded =
    input.state === "active" && triggerCodes.length > 0

  const degradedCadence = deriveDegradedCadence(input.cadence)
  const shouldApplyDowngradedCadence =
    (shouldTransitionToDegraded || input.state === "degraded") &&
    shouldDowngradeCadence(input.cadence)

  const reason =
    triggerCodes.length > 0
      ? `Lifecycle automation triggers: ${triggerCodes.join(", ")}`
      : null

  const alertSeverity: "warn" | "critical" | null =
    triggerCodes.length === 0
      ? null
      : triggerCodes.some((code) =>
            code === "consecutive_failures" || code === "rolling_failure_rate_spike"
          )
        ? "critical"
        : "warn"

  const evidenceBundle =
    triggerCodes.length === 0
      ? null
      : {
          version: LIFECYCLE_AUTOMATION_VERSION,
          source_key: input.sourceKey,
          generated_at: input.nowIso,
          status: input.finalRunStatus,
          trigger_codes: triggerCodes,
          reason,
          suggested_state: shouldTransitionToDegraded ? "degraded" : input.state,
          cadence_before: input.cadence,
          cadence_after: shouldApplyDowngradedCadence ? degradedCadence : input.cadence,
          health_snapshot: {
            health_score: health.healthScore,
            consecutive_failures: health.consecutiveFailures,
            consecutive_low_quality_runs: health.consecutiveLowQualityRuns,
            observed_runs: health.observedRuns,
            observed_failed_runs: health.observedFailedRuns,
            rolling_failure_rate_30d: input.rollingFailureRate30d,
            rolling_promotion_rate_30d: input.rollingPromotionRate30d,
            last_run_candidate_count: health.lastRunCandidateCount,
            last_run_curated_candidate_count: health.lastRunCuratedCandidateCount,
          },
          recommended_actions: buildRecommendedActions(triggerCodes),
        }

  return {
    shouldTransitionToDegraded,
    shouldDowngradeCadence: shouldApplyDowngradedCadence,
    degradedCadence: shouldApplyDowngradedCadence ? degradedCadence : null,
    triggerCodes,
    reason,
    alertSeverity,
    evidenceBundle,
  }
}

export const mergeLifecycleAlertMetadata = (params: {
  metadataJson: Record<string, unknown>
  evidenceBundle: Record<string, unknown>
  transitionedToDegraded: boolean
  downgradedCadence: boolean
  nowIso: string
}): Record<string, unknown> => {
  const metadataJson = asRecord(params.metadataJson)
  const lifecycle = asRecord(metadataJson.lifecycle)
  const historyRaw = lifecycle.alert_history

  const priorHistory = Array.isArray(historyRaw)
    ? historyRaw.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
    : []

  const nextHistory = [params.evidenceBundle, ...priorHistory].slice(0, MAX_ALERT_HISTORY)

  return {
    ...metadataJson,
    lifecycle: {
      ...lifecycle,
      version: LIFECYCLE_AUTOMATION_VERSION,
      last_alert: params.evidenceBundle,
      alert_history: nextHistory,
      last_automation_at: params.nowIso,
      last_automation_result: {
        transitioned_to_degraded: params.transitionedToDegraded,
        downgraded_cadence: params.downgradedCadence,
      },
    },
  }
}

