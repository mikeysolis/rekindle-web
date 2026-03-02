import assert from "node:assert/strict"
import test from "node:test"

import {
  filterPagesForStrategy,
  mergeStrategyPerformanceMetadata,
  normalizeStrategyOrder,
  selectStrategyPlan,
  type StrategyExecutionAttempt,
} from "./strategy-selection.js"

test("normalizeStrategyOrder keeps allowed values and dedupes", () => {
  const normalized = normalizeStrategyOrder([
    "ics",
    "sitemap_html",
    "ics",
    "unknown",
    "feed",
  ])

  assert.deepEqual(normalized, ["ics", "sitemap_html", "feed"])
})

test("selectStrategyPlan prefers strategy with strong availability and reliability", () => {
  const plan = selectStrategyPlan({
    sourceKey: "action_for_happiness",
    configuredOrder: ["ics", "sitemap_html"],
    discoveredUrls: [
      "https://www.actionforhappiness.org/calendar/feed.ics",
      "https://www.actionforhappiness.org/calendar/event/small-kindness",
    ],
    metadataJson: {
      strategy_performance: {
        ics: {
          rolling_success_rate: 0.9,
          rolling_yield_rate: 0.9,
        },
        sitemap_html: {
          rolling_success_rate: 0.4,
          rolling_yield_rate: 0.3,
        },
      },
    },
    legalRiskLevel: "low",
  })

  assert.equal(plan.selectedPrimary, "ics")
  assert.equal(plan.rankedOrder[0], "ics")
  assert.ok(plan.reasoning[0]?.includes("Selected primary strategy"))
})

test("filterPagesForStrategy maps URLs into strategy buckets", () => {
  const pages = [
    {
      id: "1",
      run_id: "run",
      source_key: "source",
      url: "https://example.org/feed.xml",
      status: "discovered",
    },
    {
      id: "2",
      run_id: "run",
      source_key: "source",
      url: "https://example.org/calendar/events.ics",
      status: "discovered",
    },
    {
      id: "3",
      run_id: "run",
      source_key: "source",
      url: "https://example.org/ideas/try-this",
      status: "discovered",
    },
  ]

  assert.equal(filterPagesForStrategy(pages, "feed").length, 1)
  assert.equal(filterPagesForStrategy(pages, "ics").length, 1)
  assert.equal(filterPagesForStrategy(pages, "sitemap_html").length, 1)
})

test("mergeStrategyPerformanceMetadata updates rolling stats and counters", () => {
  const attempts: StrategyExecutionAttempt[] = [
    {
      strategy: "ics",
      status: "success",
      pagesConsidered: 2,
      pagesSucceeded: 2,
      pagesFailed: 0,
      candidateCount: 8,
      curatedCandidateCount: 6,
      qualityFilteredCandidateCount: 2,
      startedAt: "2026-03-01T01:00:00.000Z",
      finishedAt: "2026-03-01T01:01:00.000Z",
      durationMs: 60_000,
      fallbackReason: null,
    },
    {
      strategy: "sitemap_html",
      status: "failed",
      pagesConsidered: 3,
      pagesSucceeded: 0,
      pagesFailed: 3,
      candidateCount: 0,
      curatedCandidateCount: 0,
      qualityFilteredCandidateCount: 0,
      startedAt: "2026-03-01T01:02:00.000Z",
      finishedAt: "2026-03-01T01:03:00.000Z",
      durationMs: 60_000,
      fallbackReason: "primary_failed",
    },
  ]

  const merged = mergeStrategyPerformanceMetadata({}, attempts)
  const performance = (merged.strategy_performance ?? {}) as Record<string, Record<string, unknown>>

  assert.equal(performance.ics?.attempts_total, 1)
  assert.equal(performance.ics?.success_total, 1)
  assert.equal(performance.ics?.last_candidate_count, 8)

  assert.equal(performance.sitemap_html?.attempts_total, 1)
  assert.equal(performance.sitemap_html?.failure_total, 1)
  assert.equal(performance.sitemap_html?.last_status, "failed")
})

