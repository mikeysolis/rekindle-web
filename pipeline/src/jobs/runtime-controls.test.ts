import assert from "node:assert/strict"
import test from "node:test"

import {
  computeSourceHealthPatch,
  evaluateCadence,
  evaluateSourceCompliancePreRun,
  filterUrlsByPatterns,
  mergeComplianceAlertMetadata,
  parseCadenceIntervalMs,
  resolveSourceRuntimePolicy,
  runWithRetry,
  type SourceRegistryRuntimeRecord,
} from "./runtime-controls.js"

test("resolveSourceRuntimePolicy applies registry + metadata retry settings", () => {
  const runtime: SourceRegistryRuntimeRecord = {
    sourceKey: "rak",
    state: "active",
    approvedForProd: true,
    legalRiskLevel: "low",
    robotsCheckedAt: "2026-02-27T00:00:00.000Z",
    termsCheckedAt: "2026-02-20T00:00:00.000Z",
    cadence: "FREQ=DAILY;BYHOUR=2;BYMINUTE=0",
    maxRps: 2.5,
    maxConcurrency: 4,
    timeoutSeconds: 45,
    includeUrlPatterns: ["/kindness-ideas"],
    excludeUrlPatterns: ["/category/"],
    metadataJson: {
      runtime: {
        retry_max_attempts: 3,
        retry_backoff_ms: 1200,
        retry_backoff_multiplier: 1.5,
      },
    },
    lastRunAt: null,
    lastSuccessAt: null,
    rollingPromotionRate30d: null,
    rollingFailureRate30d: null,
  }

  const policy = resolveSourceRuntimePolicy(runtime)

  assert.equal(policy.maxRps, 2.5)
  assert.equal(policy.maxConcurrency, 4)
  assert.equal(policy.timeoutSeconds, 45)
  assert.equal(policy.retryMaxAttempts, 3)
  assert.equal(policy.retryBackoffMs, 1200)
  assert.equal(policy.retryBackoffMultiplier, 1.5)
  assert.deepEqual(policy.includeUrlPatterns, ["/kindness-ideas"])
  assert.deepEqual(policy.excludeUrlPatterns, ["/category/"])
})

test("parseCadenceIntervalMs supports hourly/daily/weekly", () => {
  assert.equal(parseCadenceIntervalMs("FREQ=HOURLY;INTERVAL=2"), 2 * 60 * 60 * 1000)
  assert.equal(parseCadenceIntervalMs("FREQ=DAILY"), 24 * 60 * 60 * 1000)
  assert.equal(parseCadenceIntervalMs("FREQ=WEEKLY;INTERVAL=3"), 3 * 7 * 24 * 60 * 60 * 1000)
  assert.equal(parseCadenceIntervalMs("FREQ=MONTHLY"), null)
})

test("evaluateCadence marks not-due runs when interval window has not elapsed", () => {
  const now = Date.parse("2026-03-01T10:00:00.000Z")
  const lastRunAt = "2026-03-01T08:30:00.000Z"

  const evalResult = evaluateCadence("FREQ=HOURLY;INTERVAL=3", lastRunAt, now)

  assert.equal(evalResult.isDue, false)
  assert.equal(evalResult.reason, "cadence_not_due")
  assert.equal(evalResult.nextRunAt, "2026-03-01T11:30:00.000Z")
})

test("filterUrlsByPatterns applies include/exclude with fallback wildcard handling", () => {
  const result = filterUrlsByPatterns(
    [
      "https://example.com/ideas/1",
      "https://example.com/ideas/2",
      "https://example.com/blog/3",
      "https://example.com/ideas/2",
    ],
    ["/ideas/"],
    ["*ideas/2"],
  )

  assert.deepEqual(result.accepted, ["https://example.com/ideas/1"])
  assert.equal(result.droppedByInclude, 1)
  assert.equal(result.droppedByExclude, 1)
  assert.equal(result.invalidPatternCount, 0)
})

test("runWithRetry retries transient failures and returns final attempt count", async () => {
  let attempts = 0

  const result = await runWithRetry({
    operationLabel: "test-op",
    timeoutMs: 1000,
    maxAttempts: 3,
    backoffMs: 0,
    backoffMultiplier: 2,
    operation: async () => {
      attempts += 1
      if (attempts < 3) {
        throw new Error("transient")
      }
      return "ok"
    },
  })

  assert.equal(result.value, "ok")
  assert.equal(result.attempts, 3)
})

test("computeSourceHealthPatch updates rolling rates and health metadata", () => {
  const nowIso = "2026-03-01T10:00:00.000Z"

  const patch = computeSourceHealthPatch({
    nowIso,
    status: "partial",
    discoveredPages: 10,
    extractedPages: 8,
    failedPages: 2,
    candidateCount: 6,
    curatedCandidateCount: 3,
    qualityFilteredCandidateCount: 3,
    skippedByCadence: false,
    runError: null,
    policy: {
      cadence: "FREQ=DAILY",
      maxRps: 1,
      maxConcurrency: 2,
      timeoutSeconds: 30,
      retryMaxAttempts: 2,
      retryBackoffMs: 750,
      retryBackoffMultiplier: 2,
      includeUrlPatterns: [],
      excludeUrlPatterns: [],
    },
    prior: {
      lastSuccessAt: "2026-02-28T10:00:00.000Z",
      rollingPromotionRate30d: 0.4,
      rollingFailureRate30d: 0.1,
      metadataJson: {
        health: {
          consecutive_failures: 2,
          health_score: 67,
        },
      },
    },
  })

  assert.equal(patch.lastRunAt, nowIso)
  assert.equal(patch.lastSuccessAt, nowIso)
  assert.ok((patch.rollingPromotionRate30d ?? 0) > 0.4)
  assert.ok((patch.rollingFailureRate30d ?? 1) > 0.1)

  const health = (patch.metadataJson.health as Record<string, unknown>) ?? {}
  assert.equal(health.version, "ing022_v1")
  assert.equal(health.last_run_status, "partial")
  assert.equal(health.consecutive_failures, 0)
  assert.equal(health.observed_runs, 1)
  assert.equal(health.observed_failed_runs, 0)
  assert.equal(health.consecutive_low_quality_runs, 0)
  assert.equal(health.skipped_by_cadence, false)
})

test("evaluateSourceCompliancePreRun blocks non-compliant active source and suggests lifecycle transition", () => {
  const runtime: SourceRegistryRuntimeRecord = {
    sourceKey: "rak",
    state: "active",
    approvedForProd: true,
    legalRiskLevel: "low",
    robotsCheckedAt: "2026-02-01T00:00:00.000Z",
    termsCheckedAt: "2026-01-01T00:00:00.000Z",
    cadence: "FREQ=DAILY;BYHOUR=2;BYMINUTE=0",
    maxRps: 1,
    maxConcurrency: 1,
    timeoutSeconds: 30,
    includeUrlPatterns: [],
    excludeUrlPatterns: [],
    metadataJson: {
      compliance: {
        legal_hold: false,
      },
    },
    lastRunAt: null,
    lastSuccessAt: null,
    rollingPromotionRate30d: null,
    rollingFailureRate30d: null,
  }

  const result = evaluateSourceCompliancePreRun({
    sourceKey: "rak",
    runtimeRecord: runtime,
    nowIso: "2026-03-01T00:00:00.000Z",
    robotsPolicyTtlDays: 7,
    termsPolicyTtlDays: 30,
  })

  assert.equal(result.isCompliant, false)
  assert.equal(result.shouldBlock, true)
  assert.equal(result.severity, "warn")
  assert.equal(result.transitionState, "degraded")
  assert.ok(result.reasonCodes.includes("robots_check_stale"))
  assert.ok(result.reasonCodes.includes("terms_check_stale"))
  assert.ok(result.message?.includes("Compliance pre-run check failed"))
})

test("evaluateSourceCompliancePreRun escalates to pause for legal hold", () => {
  const runtime: SourceRegistryRuntimeRecord = {
    sourceKey: "rak",
    state: "active",
    approvedForProd: true,
    legalRiskLevel: "high",
    robotsCheckedAt: "2026-02-27T00:00:00.000Z",
    termsCheckedAt: "2026-02-27T00:00:00.000Z",
    cadence: "FREQ=DAILY;BYHOUR=2;BYMINUTE=0",
    maxRps: 1,
    maxConcurrency: 1,
    timeoutSeconds: 30,
    includeUrlPatterns: [],
    excludeUrlPatterns: [],
    metadataJson: {
      compliance: {
        legal_hold: true,
      },
    },
    lastRunAt: null,
    lastSuccessAt: null,
    rollingPromotionRate30d: null,
    rollingFailureRate30d: null,
  }

  const result = evaluateSourceCompliancePreRun({
    sourceKey: "rak",
    runtimeRecord: runtime,
    nowIso: "2026-03-01T00:00:00.000Z",
    robotsPolicyTtlDays: 7,
    termsPolicyTtlDays: 30,
  })

  assert.equal(result.isCompliant, false)
  assert.equal(result.severity, "critical")
  assert.equal(result.transitionState, "paused")
  assert.ok(result.reasonCodes.includes("legal_hold_active"))
})

test("mergeComplianceAlertMetadata appends bounded alert history on failures", () => {
  const merged = mergeComplianceAlertMetadata({
    metadataJson: {
      compliance: {
        alert_history: Array.from({ length: 20 }, (_value, index) => ({
          id: `prior-${index}`,
        })),
      },
    },
    evidenceBundle: {
      id: "new-alert",
      reason_codes: ["robots_check_stale"],
    },
    nowIso: "2026-03-01T00:00:00.000Z",
    failed: true,
  })

  const compliance = (merged.compliance as Record<string, unknown>) ?? {}
  const history = (compliance.alert_history as Array<Record<string, unknown>>) ?? []
  assert.equal(compliance.last_pre_run_check_status, "failed")
  assert.equal(history.length, 20)
  assert.equal(history[0]?.id, "new-alert")
})
