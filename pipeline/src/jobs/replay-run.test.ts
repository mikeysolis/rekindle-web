import assert from "node:assert/strict"
import test from "node:test"

import type { StoredCandidate } from "../durable-store/repository.js"
import {
  evaluateReplayDeterminism,
  extractSourceConfigVersionFromRunMeta,
} from "./replay-run.js"

const buildCandidate = (
  key: string,
  status: StoredCandidate["status"] = "curated"
): StoredCandidate => ({
  id: key,
  run_id: "run-1",
  page_id: null,
  source_key: "rak",
  source_url: `https://example.org/${key}`,
  title: `Title ${key}`,
  description: "description",
  reason_snippet: "reason",
  raw_excerpt: "excerpt",
  candidate_key: key,
  status,
  meta_json: {},
  traits: [],
})

test("extractSourceConfigVersionFromRunMeta reads run_versions before fallback fields", () => {
  const version = extractSourceConfigVersionFromRunMeta({
    run_versions: {
      source_config_version: "42",
    },
    strategy_selection: {
      source_config_version: "41",
    },
    source_config_version: "40",
  })

  assert.equal(version, "42")
})

test("extractSourceConfigVersionFromRunMeta falls back to strategy selection and top-level fields", () => {
  const fromStrategy = extractSourceConfigVersionFromRunMeta({
    strategy_selection: {
      source_config_version: "9",
    },
  })
  assert.equal(fromStrategy, "9")

  const fromTopLevel = extractSourceConfigVersionFromRunMeta({
    source_config_version: "7",
  })
  assert.equal(fromTopLevel, "7")
})

test("evaluateReplayDeterminism passes when deltas and overlap remain within tolerance", () => {
  const original = [
    buildCandidate("a", "curated"),
    buildCandidate("b", "curated"),
    buildCandidate("c", "normalized"),
  ]
  const replay = [
    buildCandidate("a", "curated"),
    buildCandidate("b", "curated"),
    buildCandidate("d", "normalized"),
  ]

  const result = evaluateReplayDeterminism({
    originalCandidates: original,
    replayCandidates: replay,
    tolerance: {
      maxCandidateDeltaRatio: 0,
      maxCuratedDeltaRatio: 0,
      maxQualityFilteredDeltaRatio: 1,
      minCandidateDeltaAbsolute: 0,
      minCuratedDeltaAbsolute: 0,
      minQualityFilteredDeltaAbsolute: 1,
      minCandidateKeyOverlapRatio: 0.5,
      minCuratedKeyOverlapRatio: 1,
    },
  })

  assert.equal(result.passed, true)
  assert.equal(result.failureReasons.length, 0)
  assert.equal(result.overlap.candidateKeys?.toFixed(3), "0.500")
  assert.equal(result.overlap.curatedCandidateKeys?.toFixed(3), "1.000")
})

test("evaluateReplayDeterminism fails when candidate deltas and overlap exceed tolerance", () => {
  const original = [
    buildCandidate("a", "curated"),
    buildCandidate("b", "curated"),
    buildCandidate("c", "normalized"),
    buildCandidate("d", "normalized"),
  ]
  const replay = [
    buildCandidate("x", "normalized"),
    buildCandidate("y", "normalized"),
    buildCandidate("z", "normalized"),
    buildCandidate("u", "normalized"),
    buildCandidate("v", "normalized"),
    buildCandidate("w", "normalized"),
  ]

  const result = evaluateReplayDeterminism({
    originalCandidates: original,
    replayCandidates: replay,
    tolerance: {
      maxCandidateDeltaRatio: 0.1,
      maxCuratedDeltaRatio: 0.1,
      maxQualityFilteredDeltaRatio: 0.1,
      minCandidateDeltaAbsolute: 0,
      minCuratedDeltaAbsolute: 0,
      minQualityFilteredDeltaAbsolute: 0,
      minCandidateKeyOverlapRatio: 0.9,
      minCuratedKeyOverlapRatio: 0.9,
    },
  })

  assert.equal(result.passed, false)
  assert.ok(
    result.failureReasons.some((reason) => reason.includes("candidate_count_delta_exceeded"))
  )
  assert.ok(
    result.failureReasons.some((reason) => reason.includes("curated_count_delta_exceeded"))
  )
  assert.ok(
    result.failureReasons.some((reason) =>
      reason.includes("quality_filtered_count_delta_exceeded")
    )
  )
  assert.ok(
    result.failureReasons.some((reason) => reason.includes("candidate_key_overlap_below_threshold"))
  )
})
