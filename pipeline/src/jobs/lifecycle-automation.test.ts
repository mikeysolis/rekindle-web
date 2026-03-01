import assert from "node:assert/strict"
import test from "node:test"

import {
  evaluateLifecycleAutomation,
  mergeLifecycleAlertMetadata,
} from "./lifecycle-automation.js"

test("evaluateLifecycleAutomation triggers degrade on sustained failures", () => {
  const decision = evaluateLifecycleAutomation({
    sourceKey: "rak",
    state: "active",
    cadence: "FREQ=DAILY;BYHOUR=2;BYMINUTE=0",
    skippedByCadence: false,
    finalRunStatus: "failed",
    rollingFailureRate30d: 0.62,
    rollingPromotionRate30d: 0.02,
    nowIso: "2026-03-01T10:00:00.000Z",
    metadataJson: {
      health: {
        consecutive_failures: 3,
        consecutive_low_quality_runs: 0,
        observed_runs: 8,
        observed_failed_runs: 5,
        last_run_candidate_count: 0,
        last_run_curated_candidate_count: 0,
      },
    },
  })

  assert.equal(decision.shouldTransitionToDegraded, true)
  assert.equal(decision.shouldDowngradeCadence, true)
  assert.ok(decision.degradedCadence?.startsWith("FREQ=WEEKLY"))
  assert.ok(decision.triggerCodes.includes("consecutive_failures"))
  assert.ok(decision.evidenceBundle)
})

test("evaluateLifecycleAutomation triggers quality drop without failure spike", () => {
  const decision = evaluateLifecycleAutomation({
    sourceKey: "ggia",
    state: "active",
    cadence: "FREQ=DAILY;BYHOUR=2;BYMINUTE=10",
    skippedByCadence: false,
    finalRunStatus: "partial",
    rollingFailureRate30d: 0.2,
    rollingPromotionRate30d: 0.01,
    nowIso: "2026-03-01T10:00:00.000Z",
    metadataJson: {
      health: {
        consecutive_failures: 0,
        consecutive_low_quality_runs: 3,
        observed_runs: 10,
        observed_failed_runs: 2,
        last_run_candidate_count: 9,
        last_run_curated_candidate_count: 0,
      },
    },
  })

  assert.equal(decision.shouldTransitionToDegraded, true)
  assert.ok(decision.triggerCodes.includes("quality_drop"))
  assert.equal(decision.alertSeverity, "warn")
})

test("evaluateLifecycleAutomation does nothing when skipped by cadence", () => {
  const decision = evaluateLifecycleAutomation({
    sourceKey: "dosomething",
    state: "active",
    cadence: "FREQ=DAILY",
    skippedByCadence: true,
    finalRunStatus: "success",
    rollingFailureRate30d: 0.1,
    rollingPromotionRate30d: 0.2,
    nowIso: "2026-03-01T10:00:00.000Z",
    metadataJson: {},
  })

  assert.equal(decision.shouldTransitionToDegraded, false)
  assert.equal(decision.shouldDowngradeCadence, false)
  assert.equal(decision.evidenceBundle, null)
})

test("mergeLifecycleAlertMetadata appends bounded alert history", () => {
  const merged = mergeLifecycleAlertMetadata({
    metadataJson: {
      lifecycle: {
        alert_history: [{ code: "prior_alert" }],
      },
    },
    evidenceBundle: {
      code: "new_alert",
      generated_at: "2026-03-01T10:00:00.000Z",
    },
    transitionedToDegraded: true,
    downgradedCadence: true,
    nowIso: "2026-03-01T10:00:00.000Z",
  })

  const lifecycle = (merged.lifecycle ?? {}) as Record<string, unknown>
  const history = (lifecycle.alert_history ?? []) as Array<Record<string, unknown>>

  assert.equal(history.length, 2)
  assert.equal(history[0]?.code, "new_alert")
  assert.equal((lifecycle.last_automation_result as Record<string, unknown>)?.transitioned_to_degraded, true)
})

