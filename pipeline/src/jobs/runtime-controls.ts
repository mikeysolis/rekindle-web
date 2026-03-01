import type { Logger } from "../core/logger.js"

export interface SourceRegistryRuntimeRecord {
  sourceKey: string
  state: string
  approvedForProd: boolean
  legalRiskLevel: string
  robotsCheckedAt: string | null
  termsCheckedAt: string | null
  cadence: string | null
  maxRps: number | null
  maxConcurrency: number | null
  timeoutSeconds: number | null
  includeUrlPatterns: string[]
  excludeUrlPatterns: string[]
  metadataJson: Record<string, unknown>
  lastRunAt: string | null
  lastSuccessAt: string | null
  rollingPromotionRate30d: number | null
  rollingFailureRate30d: number | null
}

export interface SourceRuntimePolicy {
  cadence: string | null
  maxRps: number
  maxConcurrency: number
  timeoutSeconds: number
  includeUrlPatterns: string[]
  excludeUrlPatterns: string[]
  retryMaxAttempts: number
  retryBackoffMs: number
  retryBackoffMultiplier: number
}

export interface CadenceEvaluation {
  cadence: string | null
  minIntervalMs: number | null
  isDue: boolean
  reason: string
  nextRunAt: string | null
}

export interface UrlFilterResult {
  accepted: string[]
  droppedByInclude: number
  droppedByExclude: number
  invalidPatternCount: number
}

export interface RetryExecutionOptions<T> {
  operation: () => Promise<T>
  operationLabel: string
  timeoutMs: number
  maxAttempts: number
  backoffMs: number
  backoffMultiplier: number
  logger?: Logger
}

export interface RetryExecutionResult<T> {
  value: T
  attempts: number
}

export interface SourceHealthComputationInput {
  nowIso: string
  status: "success" | "partial" | "failed"
  discoveredPages: number
  extractedPages: number
  failedPages: number
  candidateCount: number
  curatedCandidateCount: number
  qualityFilteredCandidateCount: number
  skippedByCadence: boolean
  runError?: string | null
  policy: SourceRuntimePolicy
  prior: Pick<
    SourceRegistryRuntimeRecord,
    "lastSuccessAt" | "rollingPromotionRate30d" | "rollingFailureRate30d" | "metadataJson"
  >
}

export interface SourceHealthComputationResult {
  lastRunAt: string
  lastSuccessAt: string | null
  rollingPromotionRate30d: number | null
  rollingFailureRate30d: number | null
  metadataJson: Record<string, unknown>
}

export type ComplianceFailureSeverity = "warn" | "critical"
export type ComplianceTransitionState = "degraded" | "paused"

export interface CompliancePreRunInput {
  sourceKey: string
  runtimeRecord: SourceRegistryRuntimeRecord | null
  nowIso: string
  robotsPolicyTtlDays: number
  termsPolicyTtlDays: number
}

export interface CompliancePreRunResult {
  isCompliant: boolean
  shouldBlock: boolean
  reasonCodes: string[]
  transitionState: ComplianceTransitionState | null
  severity: ComplianceFailureSeverity | null
  message: string | null
  evidenceBundle: Record<string, unknown> | null
}

const DEFAULT_MAX_RPS = 1
const DEFAULT_MAX_CONCURRENCY = 1
const DEFAULT_TIMEOUT_SECONDS = 30
const DEFAULT_RETRY_MAX_ATTEMPTS = 2
const DEFAULT_RETRY_BACKOFF_MS = 750
const DEFAULT_RETRY_BACKOFF_MULTIPLIER = 2
export const DEFAULT_COMPLIANCE_ROBOTS_TTL_DAYS = 7
export const DEFAULT_COMPLIANCE_TERMS_TTL_DAYS = 30
const ROLLING_RATE_ALPHA = 0.2
const HEALTH_SCORE_VERSION = "ing022_v1"
const COMPLIANCE_PRECHECK_VERSION = "ing050_v1"
const MAX_COMPLIANCE_ALERT_HISTORY = 20

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

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

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }

  return null
}

const asNonNegativeInteger = (value: unknown, fallback: number): number => {
  const numeric = asFiniteNumber(value)
  if (numeric === null) {
    return fallback
  }

  const rounded = Math.round(numeric)
  if (rounded < 0) {
    return fallback
  }

  return rounded
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

const getByPath = (value: unknown, path: string[]): unknown => {
  let cursor: unknown = value
  for (const segment of path) {
    if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
      return undefined
    }
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

const readRetrySetting = (
  metadataJson: Record<string, unknown>,
  candidatePaths: string[][]
): number | null => {
  for (const path of candidatePaths) {
    const value = getByPath(metadataJson, path)
    const numeric = asFiniteNumber(value)
    if (numeric !== null) {
      return numeric
    }
  }
  return null
}

export const resolveSourceRuntimePolicy = (
  runtimeRecord: SourceRegistryRuntimeRecord | null
): SourceRuntimePolicy => {
  const metadataJson = asRecord(runtimeRecord?.metadataJson)

  const retryMaxAttempts = readRetrySetting(metadataJson, [
    ["runtime", "retry_max_attempts"],
    ["runtime", "retryMaxAttempts"],
    ["runtime", "max_retries"],
    ["retry_max_attempts"],
    ["retryMaxAttempts"],
    ["max_retries"],
  ])

  const retryBackoffMs = readRetrySetting(metadataJson, [
    ["runtime", "retry_backoff_ms"],
    ["runtime", "retryBackoffMs"],
    ["retry_backoff_ms"],
    ["retryBackoffMs"],
  ])

  const retryBackoffMultiplier = readRetrySetting(metadataJson, [
    ["runtime", "retry_backoff_multiplier"],
    ["runtime", "retryBackoffMultiplier"],
    ["retry_backoff_multiplier"],
    ["retryBackoffMultiplier"],
  ])

  return {
    cadence: runtimeRecord?.cadence ?? null,
    maxRps: clamp(runtimeRecord?.maxRps ?? DEFAULT_MAX_RPS, 0.1, 20),
    maxConcurrency: Math.round(
      clamp(runtimeRecord?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY, 1, 20)
    ),
    timeoutSeconds: Math.round(
      clamp(runtimeRecord?.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS, 5, 300)
    ),
    includeUrlPatterns: asStringArray(runtimeRecord?.includeUrlPatterns),
    excludeUrlPatterns: asStringArray(runtimeRecord?.excludeUrlPatterns),
    retryMaxAttempts: Math.round(clamp(retryMaxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS, 1, 8)),
    retryBackoffMs: Math.round(clamp(retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS, 100, 15_000)),
    retryBackoffMultiplier: clamp(
      retryBackoffMultiplier ?? DEFAULT_RETRY_BACKOFF_MULTIPLIER,
      1,
      5
    ),
  }
}

const readComplianceLegalHold = (
  metadataJson: Record<string, unknown>,
  nowIso: string
): boolean => {
  const compliance = asRecord(metadataJson.compliance)

  const legalHoldFlag = asBoolean(compliance.legal_hold)
  if (legalHoldFlag === true) {
    return true
  }

  const statusRaw = compliance.status
  const status =
    typeof statusRaw === "string" ? statusRaw.trim().toLowerCase() : ""
  if (status === "legal_hold" || status === "hold" || status === "blocked") {
    return true
  }

  const holdUntilRaw = compliance.legal_hold_until
  if (typeof holdUntilRaw === "string") {
    const holdUntilMs = Date.parse(holdUntilRaw)
    const nowMs = Date.parse(nowIso)
    if (Number.isFinite(holdUntilMs) && Number.isFinite(nowMs) && holdUntilMs > nowMs) {
      return true
    }
  }

  return false
}

const computeCheckAgeDays = (checkedAt: string | null, nowMs: number): number | null => {
  if (!checkedAt) {
    return null
  }

  const checkedMs = Date.parse(checkedAt)
  if (!Number.isFinite(checkedMs)) {
    return null
  }

  const ageMs = Math.max(0, nowMs - checkedMs)
  return Math.floor(ageMs / (24 * 60 * 60 * 1000))
}

const COMPLIANCE_REASON_MESSAGES: Record<string, string> = {
  source_not_registered: "source is not registered in ingest_source_registry",
  source_not_active: "source state is not active",
  source_not_approved: "source is not approved for production",
  robots_check_missing: "robots review timestamp is missing",
  robots_check_invalid: "robots review timestamp is invalid",
  robots_check_stale: "robots review timestamp is older than policy TTL",
  terms_check_missing: "terms review timestamp is missing",
  terms_check_invalid: "terms review timestamp is invalid",
  terms_check_stale: "terms review timestamp is older than policy TTL",
  legal_hold_active: "source is on legal hold",
}

const formatComplianceFailureMessage = (reasonCodes: string[]): string => {
  if (reasonCodes.length === 0) {
    return "Compliance pre-run check passed."
  }

  return `Compliance pre-run check failed: ${reasonCodes
    .map((code) => COMPLIANCE_REASON_MESSAGES[code] ?? code)
    .join("; ")}.`
}

export const evaluateSourceCompliancePreRun = (
  input: CompliancePreRunInput
): CompliancePreRunResult => {
  const robotsPolicyTtlDays = Math.max(
    1,
    asNonNegativeInteger(input.robotsPolicyTtlDays, DEFAULT_COMPLIANCE_ROBOTS_TTL_DAYS)
  )
  const termsPolicyTtlDays = Math.max(
    1,
    asNonNegativeInteger(input.termsPolicyTtlDays, DEFAULT_COMPLIANCE_TERMS_TTL_DAYS)
  )

  const nowMs = Date.parse(input.nowIso)
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now()

  if (!input.runtimeRecord) {
    const reasonCodes = ["source_not_registered"]
    const message = formatComplianceFailureMessage(reasonCodes)
    return {
      isCompliant: false,
      shouldBlock: true,
      reasonCodes,
      transitionState: null,
      severity: "critical",
      message,
      evidenceBundle: {
        version: COMPLIANCE_PRECHECK_VERSION,
        source_key: input.sourceKey,
        checked_at: input.nowIso,
        status: "failed",
        reason_codes: reasonCodes,
        severity: "critical",
        transition_state: null,
        robots_policy_ttl_days: robotsPolicyTtlDays,
        terms_policy_ttl_days: termsPolicyTtlDays,
      },
    }
  }

  const runtime = input.runtimeRecord
  const reasonCodes: string[] = []
  const metadataJson = asRecord(runtime.metadataJson)
  const legalHoldActive = readComplianceLegalHold(metadataJson, input.nowIso)

  if (runtime.state !== "active") {
    reasonCodes.push("source_not_active")
  }

  if (!runtime.approvedForProd) {
    reasonCodes.push("source_not_approved")
  }

  if (legalHoldActive) {
    reasonCodes.push("legal_hold_active")
  }

  const robotsAgeDays = computeCheckAgeDays(runtime.robotsCheckedAt, safeNowMs)
  if (!runtime.robotsCheckedAt) {
    reasonCodes.push("robots_check_missing")
  } else if (robotsAgeDays === null) {
    reasonCodes.push("robots_check_invalid")
  } else if (robotsAgeDays > robotsPolicyTtlDays) {
    reasonCodes.push("robots_check_stale")
  }

  const termsAgeDays = computeCheckAgeDays(runtime.termsCheckedAt, safeNowMs)
  if (!runtime.termsCheckedAt) {
    reasonCodes.push("terms_check_missing")
  } else if (termsAgeDays === null) {
    reasonCodes.push("terms_check_invalid")
  } else if (termsAgeDays > termsPolicyTtlDays) {
    reasonCodes.push("terms_check_stale")
  }

  if (reasonCodes.length === 0) {
    return {
      isCompliant: true,
      shouldBlock: false,
      reasonCodes: [],
      transitionState: null,
      severity: null,
      message: null,
      evidenceBundle: {
        version: COMPLIANCE_PRECHECK_VERSION,
        source_key: runtime.sourceKey,
        checked_at: input.nowIso,
        status: "passed",
        state: runtime.state,
        approved_for_prod: runtime.approvedForProd,
        legal_risk_level: runtime.legalRiskLevel,
        legal_hold_active: legalHoldActive,
        robots_checked_at: runtime.robotsCheckedAt,
        terms_checked_at: runtime.termsCheckedAt,
        robots_check_age_days: robotsAgeDays,
        terms_check_age_days: termsAgeDays,
        robots_policy_ttl_days: robotsPolicyTtlDays,
        terms_policy_ttl_days: termsPolicyTtlDays,
        reason_codes: [],
      },
    }
  }

  const criticalFailure = reasonCodes.some(
    (code) =>
      code === "source_not_approved" ||
      code === "legal_hold_active" ||
      code === "source_not_registered"
  )

  const severity: ComplianceFailureSeverity = criticalFailure ? "critical" : "warn"
  const transitionState: ComplianceTransitionState | null =
    runtime.state === "active" ? (criticalFailure ? "paused" : "degraded") : null
  const message = formatComplianceFailureMessage(reasonCodes)

  return {
    isCompliant: false,
    shouldBlock: true,
    reasonCodes,
    transitionState,
    severity,
    message,
    evidenceBundle: {
      version: COMPLIANCE_PRECHECK_VERSION,
      source_key: runtime.sourceKey,
      checked_at: input.nowIso,
      status: "failed",
      state: runtime.state,
      approved_for_prod: runtime.approvedForProd,
      legal_risk_level: runtime.legalRiskLevel,
      legal_hold_active: legalHoldActive,
      robots_checked_at: runtime.robotsCheckedAt,
      terms_checked_at: runtime.termsCheckedAt,
      robots_check_age_days: robotsAgeDays,
      terms_check_age_days: termsAgeDays,
      robots_policy_ttl_days: robotsPolicyTtlDays,
      terms_policy_ttl_days: termsPolicyTtlDays,
      reason_codes: reasonCodes,
      severity,
      transition_state: transitionState,
    },
  }
}

export const mergeComplianceAlertMetadata = (params: {
  metadataJson: Record<string, unknown>
  evidenceBundle: Record<string, unknown>
  nowIso: string
  failed: boolean
}): Record<string, unknown> => {
  const metadataJson = asRecord(params.metadataJson)
  const compliance = asRecord(metadataJson.compliance)

  const historyRaw = compliance.alert_history
  const priorHistory = Array.isArray(historyRaw)
    ? historyRaw.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
      )
    : []

  const nextHistory = params.failed
    ? [params.evidenceBundle, ...priorHistory].slice(0, MAX_COMPLIANCE_ALERT_HISTORY)
    : priorHistory

  return {
    ...metadataJson,
    compliance: {
      ...compliance,
      version: COMPLIANCE_PRECHECK_VERSION,
      last_pre_run_check_at: params.nowIso,
      last_pre_run_check_status: params.failed ? "failed" : "passed",
      last_pre_run_check: params.evidenceBundle,
      alert_history: nextHistory,
    },
  }
}

const parseCadenceTokens = (cadence: string): Map<string, string> => {
  const map = new Map<string, string>()
  for (const token of cadence.split(";")) {
    const [rawKey, rawValue] = token.split("=", 2)
    const key = rawKey?.trim().toUpperCase()
    const value = rawValue?.trim()
    if (!key || !value) continue
    map.set(key, value)
  }
  return map
}

export const parseCadenceIntervalMs = (cadence: string): number | null => {
  const tokens = parseCadenceTokens(cadence)
  const frequency = tokens.get("FREQ")?.toUpperCase()
  if (!frequency) return null

  const intervalToken = tokens.get("INTERVAL")
  const interval = intervalToken ? Number.parseInt(intervalToken, 10) : 1
  if (!Number.isFinite(interval) || interval <= 0) return null

  switch (frequency) {
    case "HOURLY":
      return interval * 60 * 60 * 1000
    case "DAILY":
      return interval * 24 * 60 * 60 * 1000
    case "WEEKLY":
      return interval * 7 * 24 * 60 * 60 * 1000
    default:
      return null
  }
}

export const evaluateCadence = (
  cadence: string | null,
  lastRunAt: string | null,
  nowMs = Date.now()
): CadenceEvaluation => {
  if (!cadence || cadence.trim().length === 0) {
    return {
      cadence: cadence ?? null,
      minIntervalMs: null,
      isDue: true,
      reason: "no_cadence_configured",
      nextRunAt: null,
    }
  }

  const minIntervalMs = parseCadenceIntervalMs(cadence)
  if (minIntervalMs === null) {
    return {
      cadence,
      minIntervalMs,
      isDue: true,
      reason: "cadence_unparsed_treat_due",
      nextRunAt: null,
    }
  }

  if (!lastRunAt) {
    return {
      cadence,
      minIntervalMs,
      isDue: true,
      reason: "no_last_run",
      nextRunAt: null,
    }
  }

  const parsedLastRunAt = new Date(lastRunAt)
  if (Number.isNaN(parsedLastRunAt.getTime())) {
    return {
      cadence,
      minIntervalMs,
      isDue: true,
      reason: "invalid_last_run_treat_due",
      nextRunAt: null,
    }
  }

  const elapsed = nowMs - parsedLastRunAt.getTime()
  const due = elapsed >= minIntervalMs
  const nextRunAt = new Date(parsedLastRunAt.getTime() + minIntervalMs).toISOString()

  return {
    cadence,
    minIntervalMs,
    isDue: due,
    reason: due ? "cadence_due" : "cadence_not_due",
    nextRunAt,
  }
}

const compilePattern = (pattern: string): RegExp | null => {
  const trimmed = pattern.trim()
  if (!trimmed) return null

  try {
    return new RegExp(trimmed, "i")
  } catch {
    try {
      const escaped = trimmed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
      return new RegExp(`^${escaped}$`, "i")
    } catch {
      return null
    }
  }
}

export const filterUrlsByPatterns = (
  urls: string[],
  includePatterns: string[],
  excludePatterns: string[]
): UrlFilterResult => {
  const includeRegexes = includePatterns.map(compilePattern)
  const excludeRegexes = excludePatterns.map(compilePattern)

  const invalidPatternCount = [...includeRegexes, ...excludeRegexes].filter(
    (entry) => entry === null
  ).length

  const validIncludeRegexes = includeRegexes.filter((entry): entry is RegExp => entry instanceof RegExp)
  const validExcludeRegexes = excludeRegexes.filter((entry): entry is RegExp => entry instanceof RegExp)

  const includeEnabled = validIncludeRegexes.length > 0
  const deduped = [...new Set(urls)]

  const accepted: string[] = []
  let droppedByInclude = 0
  let droppedByExclude = 0

  for (const url of deduped) {
    if (includeEnabled && !validIncludeRegexes.some((regex) => regex.test(url))) {
      droppedByInclude += 1
      continue
    }

    if (validExcludeRegexes.some((regex) => regex.test(url))) {
      droppedByExclude += 1
      continue
    }

    accepted.push(url)
  }

  return {
    accepted,
    droppedByInclude,
    droppedByExclude,
    invalidPatternCount,
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  let timer: NodeJS.Timeout | null = null
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation(), timeoutPromise])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export const runWithRetry = async <T>(
  options: RetryExecutionOptions<T>
): Promise<RetryExecutionResult<T>> => {
  const maxAttempts = Math.max(1, Math.round(options.maxAttempts))
  let attempt = 1
  let backoffMs = Math.max(0, Math.round(options.backoffMs))

  while (true) {
    try {
      const value = await withTimeout(
        options.operation,
        options.timeoutMs,
        `${options.operationLabel} (attempt ${attempt})`
      )
      return { value, attempts: attempt }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (attempt >= maxAttempts) {
        throw new Error(
          `${options.operationLabel} failed after ${attempt} attempts: ${errorMessage}`
        )
      }

      options.logger?.warn("Operation attempt failed; retrying", {
        operation: options.operationLabel,
        attempt,
        maxAttempts,
        backoffMs,
        error: errorMessage,
      })

      if (backoffMs > 0) {
        await sleep(backoffMs)
      }

      backoffMs = Math.round(backoffMs * options.backoffMultiplier)
      attempt += 1
    }
  }
}

export interface OperationRateLimiter {
  waitTurn: () => Promise<void>
}

export const createOperationRateLimiter = (maxRps: number): OperationRateLimiter => {
  const clamped = clamp(maxRps, 0.1, 20)
  const minimumGapMs = Math.ceil(1000 / clamped)
  let nextAvailableAt = 0

  return {
    waitTurn: async (): Promise<void> => {
      const now = Date.now()
      const scheduledAt = nextAvailableAt > now ? nextAvailableAt : now
      const waitMs = scheduledAt - now

      nextAvailableAt = scheduledAt + minimumGapMs

      if (waitMs > 0) {
        await sleep(waitMs)
      }
    },
  }
}

const clampRate = (value: number): number => clamp(value, 0, 1)

const smoothRate = (prior: number | null, current: number): number => {
  if (prior === null) {
    return clampRate(current)
  }
  return clampRate(prior * (1 - ROLLING_RATE_ALPHA) + current * ROLLING_RATE_ALPHA)
}

const readPriorConsecutiveFailures = (metadataJson: Record<string, unknown>): number => {
  const health = asRecord(metadataJson.health)
  const value = asFiniteNumber(health.consecutive_failures)
  if (value === null) return 0
  return Math.max(0, Math.round(value))
}

const readPriorObservedRuns = (metadataJson: Record<string, unknown>): number => {
  const health = asRecord(metadataJson.health)
  const value = asFiniteNumber(health.observed_runs)
  if (value === null) return 0
  return Math.max(0, Math.round(value))
}

const readPriorObservedFailedRuns = (metadataJson: Record<string, unknown>): number => {
  const health = asRecord(metadataJson.health)
  const value = asFiniteNumber(health.observed_failed_runs)
  if (value === null) return 0
  return Math.max(0, Math.round(value))
}

const readPriorConsecutiveLowQualityRuns = (metadataJson: Record<string, unknown>): number => {
  const health = asRecord(metadataJson.health)
  const value = asFiniteNumber(health.consecutive_low_quality_runs)
  if (value === null) return 0
  return Math.max(0, Math.round(value))
}

const readPriorHealthScore = (metadataJson: Record<string, unknown>): number | null => {
  const health = asRecord(metadataJson.health)
  const value = asFiniteNumber(health.health_score)
  if (value === null) return null
  return clamp(value, 0, 100)
}

export const computeSourceHealthPatch = (
  input: SourceHealthComputationInput
): SourceHealthComputationResult => {
  const priorMetadata = asRecord(input.prior.metadataJson)
  const priorConsecutiveFailures = readPriorConsecutiveFailures(priorMetadata)
  const priorObservedRuns = readPriorObservedRuns(priorMetadata)
  const priorObservedFailedRuns = readPriorObservedFailedRuns(priorMetadata)
  const priorConsecutiveLowQualityRuns = readPriorConsecutiveLowQualityRuns(priorMetadata)

  const runPromotionRate =
    input.candidateCount > 0 ? clampRate(input.curatedCandidateCount / input.candidateCount) : 0

  const failureDenominator = Math.max(input.discoveredPages, input.extractedPages + input.failedPages)
  const runFailureRate =
    failureDenominator > 0
      ? clampRate(input.failedPages / failureDenominator)
      : input.status === "failed"
        ? 1
        : 0

  const runCompletionRate =
    input.discoveredPages > 0
      ? clampRate(input.extractedPages / input.discoveredPages)
      : input.status === "failed"
        ? 0
        : 1

  const rollingPromotionRate = input.skippedByCadence
    ? input.prior.rollingPromotionRate30d
    : smoothRate(input.prior.rollingPromotionRate30d, runPromotionRate)

  const rollingFailureRate = input.skippedByCadence
    ? input.prior.rollingFailureRate30d
    : smoothRate(input.prior.rollingFailureRate30d, runFailureRate)

  const priorScore = readPriorHealthScore(priorMetadata)
  const healthScore = input.skippedByCadence
    ? priorScore
    : Math.round(
        100 *
          clampRate(
            (1 - (rollingFailureRate ?? 0)) * 0.5 +
              (rollingPromotionRate ?? 0) * 0.3 +
              runCompletionRate * 0.2
          )
      )

  const successfulRun =
    !input.skippedByCadence && (input.status === "success" || (input.status === "partial" && input.extractedPages > 0))

  const consecutiveFailures = input.skippedByCadence
    ? priorConsecutiveFailures
    : input.status === "failed"
      ? priorConsecutiveFailures + 1
      : 0

  const observedRuns = input.skippedByCadence ? priorObservedRuns : priorObservedRuns + 1
  const observedFailedRuns = input.skippedByCadence
    ? priorObservedFailedRuns
    : input.status === "failed"
      ? priorObservedFailedRuns + 1
      : priorObservedFailedRuns

  const lowQualityRun =
    !input.skippedByCadence &&
    input.candidateCount >= 3 &&
    input.curatedCandidateCount === 0

  const consecutiveLowQualityRuns = input.skippedByCadence
    ? priorConsecutiveLowQualityRuns
    : lowQualityRun
      ? priorConsecutiveLowQualityRuns + 1
      : 0

  const mergedMetadata: Record<string, unknown> = {
    ...priorMetadata,
    health: {
      ...asRecord(priorMetadata.health),
      version: HEALTH_SCORE_VERSION,
      health_score: healthScore,
      consecutive_failures: consecutiveFailures,
      observed_runs: observedRuns,
      observed_failed_runs: observedFailedRuns,
      consecutive_low_quality_runs: consecutiveLowQualityRuns,
      last_run_status: input.status,
      last_error: input.runError ?? null,
      last_run_low_quality: lowQualityRun,
      last_run_promotion_rate: runPromotionRate,
      last_run_failure_rate: runFailureRate,
      last_run_completion_rate: runCompletionRate,
      last_run_candidate_count: input.candidateCount,
      last_run_curated_candidate_count: input.curatedCandidateCount,
      last_run_quality_filtered_candidate_count: input.qualityFilteredCandidateCount,
      last_run_discovered_pages: input.discoveredPages,
      last_run_extracted_pages: input.extractedPages,
      last_run_failed_pages: input.failedPages,
      skipped_by_cadence: input.skippedByCadence,
      runtime_policy: {
        cadence: input.policy.cadence,
        max_rps: input.policy.maxRps,
        max_concurrency: input.policy.maxConcurrency,
        timeout_seconds: input.policy.timeoutSeconds,
        retry_max_attempts: input.policy.retryMaxAttempts,
        retry_backoff_ms: input.policy.retryBackoffMs,
        retry_backoff_multiplier: input.policy.retryBackoffMultiplier,
      },
      updated_at: input.nowIso,
    },
  }

  return {
    lastRunAt: input.nowIso,
    lastSuccessAt: successfulRun ? input.nowIso : input.prior.lastSuccessAt,
    rollingPromotionRate30d: rollingPromotionRate,
    rollingFailureRate30d: rollingFailureRate,
    metadataJson: mergedMetadata,
  }
}
