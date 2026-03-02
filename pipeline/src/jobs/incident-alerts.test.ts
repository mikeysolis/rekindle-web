import assert from "node:assert/strict"
import test from "node:test"

import type {
  SourceHealthRow,
  SourceRejectionRateTrend,
} from "../durable-store/repository.js"
import {
  evaluateIncidentAlertsForSource,
  mergeIncidentAlertMetadata,
} from "./incident-alerts.js"

const baseRow = (overrides: Partial<SourceHealthRow> = {}): SourceHealthRow => ({
  sourceKey: "rak",
  displayName: "Random Acts of Kindness",
  state: "active",
  approvedForProd: true,
  cadence: "FREQ=DAILY;INTERVAL=1",
  lastRunAt: "2026-02-27T00:00:00.000Z",
  lastSuccessAt: "2026-02-26T00:00:00.000Z",
  rollingPromotionRate30d: 0.2,
  rollingFailureRate30d: 0.1,
  metadataJson: {
    health: {
      last_run_candidate_count: 10,
      last_run_curated_candidate_count: 0,
      consecutive_failures: 0,
      observed_runs: 10,
    },
    compliance: {
      last_pre_run_check_status: "passed",
    },
  },
  ...overrides,
})

const baseTrend = (overrides: Partial<SourceRejectionRateTrend> = {}): SourceRejectionRateTrend => ({
  sourceKey: "rak",
  recentReviewedCount: 50,
  recentRejectedCount: 20,
  recentRejectionRate: 0.4,
  priorReviewedCount: 50,
  priorRejectedCount: 8,
  priorRejectionRate: 0.16,
  ...overrides,
})

test("evaluateIncidentAlertsForSource detects zero-yield and schedule-miss anomalies", () => {
  const alerts = evaluateIncidentAlertsForSource({
    row: baseRow(),
    nowIso: "2026-03-01T00:00:00.000Z",
    rejectionTrend: baseTrend({
      recentRejectionRate: 0.2,
      priorRejectionRate: 0.15,
      recentRejectedCount: 10,
      priorRejectedCount: 8,
    }),
  })

  const codes = new Set(alerts.map((alert) => alert.code))
  assert.ok(codes.has("zero_yield_anomaly"))
  assert.ok(codes.has("schedule_miss"))
})

test("evaluateIncidentAlertsForSource detects failure spike and rejection surge", () => {
  const alerts = evaluateIncidentAlertsForSource({
    row: baseRow({
      rollingFailureRate30d: 0.65,
      metadataJson: {
        health: {
          last_run_candidate_count: 12,
          last_run_curated_candidate_count: 2,
          consecutive_failures: 4,
          observed_runs: 12,
        },
        compliance: {
          last_pre_run_check_status: "passed",
        },
      },
    }),
    nowIso: "2026-03-01T00:00:00.000Z",
    rejectionTrend: baseTrend(),
  })

  const codes = new Set(alerts.map((alert) => alert.code))
  assert.ok(codes.has("failure_spike"))
  assert.ok(codes.has("rejection_rate_surge"))
})

test("evaluateIncidentAlertsForSource emits compliance failure alert with sev1 mapping", () => {
  const alerts = evaluateIncidentAlertsForSource({
    row: baseRow({
      metadataJson: {
        health: {
          last_run_candidate_count: 2,
          last_run_curated_candidate_count: 1,
          consecutive_failures: 0,
          observed_runs: 2,
        },
        compliance: {
          last_pre_run_check_status: "failed",
          last_pre_run_check: {
            severity: "critical",
            reason_codes: ["legal_hold_active"],
          },
        },
      },
    }),
    nowIso: "2026-03-01T00:00:00.000Z",
  })

  const complianceAlert = alerts.find((alert) => alert.code === "compliance_failure")
  assert.ok(complianceAlert)
  assert.equal(complianceAlert?.severity, "sev1")
})

test("mergeIncidentAlertMetadata stores bounded history and routing details", () => {
  const alerts = evaluateIncidentAlertsForSource({
    row: baseRow(),
    nowIso: "2026-03-01T00:00:00.000Z",
  })

  const merged = mergeIncidentAlertMetadata({
    metadataJson: {
      incidents: {
        alert_history: Array.from({ length: 30 }, (_value, index) => ({
          prior: index,
        })),
      },
    },
    alerts,
    nowIso: "2026-03-01T00:00:00.000Z",
  })

  const incidents = (merged.incidents as Record<string, unknown>) ?? {}
  const history = (incidents.alert_history as Array<Record<string, unknown>>) ?? []
  assert.equal(incidents.version, "ing051_v1")
  assert.equal(incidents.last_alert_count, alerts.length)
  assert.equal(history.length, 30)
  assert.ok(Array.isArray(incidents.last_alerts))
})
