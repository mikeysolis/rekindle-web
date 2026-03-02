import assert from "node:assert/strict"
import test from "node:test"

import type { SourceHealthRow } from "../durable-store/repository.js"
import { buildSourceHealthEntry } from "./source-health.js"

test("buildSourceHealthEntry surfaces critical failure signals", () => {
  const row: SourceHealthRow = {
    sourceKey: "rak",
    displayName: "Random Acts of Kindness",
    state: "active",
    approvedForProd: true,
    cadence: "FREQ=DAILY",
    lastRunAt: "2026-03-01T08:00:00.000Z",
    lastSuccessAt: "2026-02-25T08:00:00.000Z",
    rollingPromotionRate30d: 0.03,
    rollingFailureRate30d: 0.45,
    metadataJson: {
      health: {
        health_score: 32,
        consecutive_failures: 4,
        last_run_status: "failed",
        last_error: "timeout",
      },
    },
  }

  const entry = buildSourceHealthEntry(row)

  assert.equal(entry.healthScore, 32)
  assert.equal(entry.consecutiveFailures, 4)
  assert.equal(entry.lastRunStatus, "failed")
  assert.equal(entry.lastError, "timeout")

  const signalCodes = entry.signals.map((signal) => signal.code)
  assert.ok(signalCodes.includes("high_failure_rate"))
  assert.ok(signalCodes.includes("consecutive_failures"))
  assert.ok(signalCodes.includes("low_health_score"))
  assert.ok(signalCodes.includes("low_yield"))
})

test("buildSourceHealthEntry returns healthy signal when no risks are present", () => {
  const row: SourceHealthRow = {
    sourceKey: "ggia",
    displayName: "GGIA",
    state: "active",
    approvedForProd: true,
    cadence: "FREQ=DAILY",
    lastRunAt: "2026-03-01T08:00:00.000Z",
    lastSuccessAt: "2026-03-01T08:00:00.000Z",
    rollingPromotionRate30d: 0.25,
    rollingFailureRate30d: 0.05,
    metadataJson: {
      health: {
        health_score: 88,
        consecutive_failures: 0,
        last_run_status: "success",
      },
    },
  }

  const entry = buildSourceHealthEntry(row)

  assert.equal(entry.signals.length, 1)
  assert.equal(entry.signals[0]?.code, "healthy")
  assert.equal(entry.signals[0]?.severity, "info")
})
