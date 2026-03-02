import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import {
  DurableStoreRepository,
  type RunStatus,
  type SourceRegistryRuntimeRecord,
  type StoredCandidate,
} from "../durable-store/repository.js"
import { runSource, type RunSourceResult } from "./run-source.js"

const REPLAY_DETERMINISM_VERSION = "ing052_v1"

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toCandidateKeySet = (
  candidates: StoredCandidate[],
  predicate?: (candidate: StoredCandidate) => boolean
): Set<string> => {
  const keys = new Set<string>()

  for (const candidate of candidates) {
    if (predicate && !predicate(candidate)) {
      continue
    }
    keys.add(candidate.candidate_key)
  }

  return keys
}

const calculateOverlapRatio = (left: Set<string>, right: Set<string>): number | null => {
  if (left.size === 0 && right.size === 0) {
    return null
  }

  let intersection = 0
  for (const key of left) {
    if (right.has(key)) {
      intersection += 1
    }
  }

  const union = left.size + right.size - intersection
  if (union <= 0) {
    return null
  }

  return intersection / union
}

const resolveNumericTolerance = (
  input: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, input))
}

const allowedDelta = (baselineCount: number, ratio: number, minAbsolute: number): number =>
  Math.max(minAbsolute, Math.ceil(baselineCount * ratio))

const countByStatus = (candidates: StoredCandidate[]): {
  total: number
  curated: number
  qualityFiltered: number
} => ({
  total: candidates.length,
  curated: candidates.filter((candidate) => candidate.status === "curated").length,
  qualityFiltered: candidates.filter((candidate) => candidate.status === "normalized").length,
})

export interface ReplayDeterminismTolerance {
  maxCandidateDeltaRatio: number
  maxCuratedDeltaRatio: number
  maxQualityFilteredDeltaRatio: number
  minCandidateDeltaAbsolute: number
  minCuratedDeltaAbsolute: number
  minQualityFilteredDeltaAbsolute: number
  minCandidateKeyOverlapRatio: number
  minCuratedKeyOverlapRatio: number
}

export interface ReplayDeterminismResult {
  version: string
  passed: boolean
  candidateDelta: {
    baseline: number
    replay: number
    delta: number
    allowed: number
  }
  curatedDelta: {
    baseline: number
    replay: number
    delta: number
    allowed: number
  }
  qualityFilteredDelta: {
    baseline: number
    replay: number
    delta: number
    allowed: number
  }
  overlap: {
    candidateKeys: number | null
    curatedCandidateKeys: number | null
  }
  tolerance: ReplayDeterminismTolerance
  failureReasons: string[]
}

export interface ReplayRunOptions {
  configVersionOverride?: string
  force?: boolean
  tolerance?: Partial<ReplayDeterminismTolerance>
}

export interface ReplayRunResult {
  originalRunId: string
  replayRunId: string
  sourceKey: string
  originalRunStatus: RunStatus
  defaultConfigVersion: string | null
  requestedConfigVersion: string | null
  resolvedConfigVersion: string | null
  configResolvedFrom: "audit_event" | "current_registry" | "current_runtime"
  overrideApplied: boolean
  replay: RunSourceResult
  determinism: ReplayDeterminismResult
  warnings: string[]
}

export const DEFAULT_REPLAY_DETERMINISM_TOLERANCE: ReplayDeterminismTolerance = {
  maxCandidateDeltaRatio: 0.35,
  maxCuratedDeltaRatio: 0.4,
  maxQualityFilteredDeltaRatio: 0.45,
  minCandidateDeltaAbsolute: 2,
  minCuratedDeltaAbsolute: 1,
  minQualityFilteredDeltaAbsolute: 1,
  minCandidateKeyOverlapRatio: 0.5,
  minCuratedKeyOverlapRatio: 0.4,
}

const resolveTolerance = (
  tolerance: Partial<ReplayDeterminismTolerance> | undefined
): ReplayDeterminismTolerance => ({
  maxCandidateDeltaRatio: resolveNumericTolerance(
    tolerance?.maxCandidateDeltaRatio,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.maxCandidateDeltaRatio,
    0,
    1
  ),
  maxCuratedDeltaRatio: resolveNumericTolerance(
    tolerance?.maxCuratedDeltaRatio,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.maxCuratedDeltaRatio,
    0,
    1
  ),
  maxQualityFilteredDeltaRatio: resolveNumericTolerance(
    tolerance?.maxQualityFilteredDeltaRatio,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.maxQualityFilteredDeltaRatio,
    0,
    1
  ),
  minCandidateDeltaAbsolute: resolveNumericTolerance(
    tolerance?.minCandidateDeltaAbsolute,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.minCandidateDeltaAbsolute,
    0,
    10_000
  ),
  minCuratedDeltaAbsolute: resolveNumericTolerance(
    tolerance?.minCuratedDeltaAbsolute,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.minCuratedDeltaAbsolute,
    0,
    10_000
  ),
  minQualityFilteredDeltaAbsolute: resolveNumericTolerance(
    tolerance?.minQualityFilteredDeltaAbsolute,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.minQualityFilteredDeltaAbsolute,
    0,
    10_000
  ),
  minCandidateKeyOverlapRatio: resolveNumericTolerance(
    tolerance?.minCandidateKeyOverlapRatio,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.minCandidateKeyOverlapRatio,
    0,
    1
  ),
  minCuratedKeyOverlapRatio: resolveNumericTolerance(
    tolerance?.minCuratedKeyOverlapRatio,
    DEFAULT_REPLAY_DETERMINISM_TOLERANCE.minCuratedKeyOverlapRatio,
    0,
    1
  ),
})

export const extractSourceConfigVersionFromRunMeta = (meta: unknown): string | null => {
  const record = asRecord(meta)

  const runVersions = asRecord(record.run_versions)
  const fromRunVersions = asNonEmptyString(runVersions.source_config_version)
  if (fromRunVersions) {
    return fromRunVersions
  }

  const strategySelection = asRecord(record.strategy_selection)
  const fromStrategySelection = asNonEmptyString(strategySelection.source_config_version)
  if (fromStrategySelection) {
    return fromStrategySelection
  }

  return asNonEmptyString(record.source_config_version)
}

export const evaluateReplayDeterminism = (params: {
  originalCandidates: StoredCandidate[]
  replayCandidates: StoredCandidate[]
  tolerance?: Partial<ReplayDeterminismTolerance>
}): ReplayDeterminismResult => {
  const tolerance = resolveTolerance(params.tolerance)

  const baselineCounts = countByStatus(params.originalCandidates)
  const replayCounts = countByStatus(params.replayCandidates)

  const candidateDelta = Math.abs(replayCounts.total - baselineCounts.total)
  const candidateDeltaAllowed = allowedDelta(
    baselineCounts.total,
    tolerance.maxCandidateDeltaRatio,
    tolerance.minCandidateDeltaAbsolute
  )

  const curatedDelta = Math.abs(replayCounts.curated - baselineCounts.curated)
  const curatedDeltaAllowed = allowedDelta(
    baselineCounts.curated,
    tolerance.maxCuratedDeltaRatio,
    tolerance.minCuratedDeltaAbsolute
  )

  const qualityFilteredDelta = Math.abs(
    replayCounts.qualityFiltered - baselineCounts.qualityFiltered
  )
  const qualityFilteredDeltaAllowed = allowedDelta(
    baselineCounts.qualityFiltered,
    tolerance.maxQualityFilteredDeltaRatio,
    tolerance.minQualityFilteredDeltaAbsolute
  )

  const baselineCandidateKeys = toCandidateKeySet(params.originalCandidates)
  const replayCandidateKeys = toCandidateKeySet(params.replayCandidates)
  const candidateKeyOverlap = calculateOverlapRatio(
    baselineCandidateKeys,
    replayCandidateKeys
  )

  const baselineCuratedKeys = toCandidateKeySet(
    params.originalCandidates,
    (candidate) => candidate.status === "curated"
  )
  const replayCuratedKeys = toCandidateKeySet(
    params.replayCandidates,
    (candidate) => candidate.status === "curated"
  )
  const curatedKeyOverlap = calculateOverlapRatio(baselineCuratedKeys, replayCuratedKeys)

  const failureReasons: string[] = []

  if (candidateDelta > candidateDeltaAllowed) {
    failureReasons.push(
      `candidate_count_delta_exceeded (${candidateDelta} > ${candidateDeltaAllowed})`
    )
  }

  if (curatedDelta > curatedDeltaAllowed) {
    failureReasons.push(`curated_count_delta_exceeded (${curatedDelta} > ${curatedDeltaAllowed})`)
  }

  if (qualityFilteredDelta > qualityFilteredDeltaAllowed) {
    failureReasons.push(
      `quality_filtered_count_delta_exceeded (${qualityFilteredDelta} > ${qualityFilteredDeltaAllowed})`
    )
  }

  if (
    candidateKeyOverlap !== null &&
    candidateKeyOverlap < tolerance.minCandidateKeyOverlapRatio
  ) {
    failureReasons.push(
      `candidate_key_overlap_below_threshold (${candidateKeyOverlap.toFixed(3)} < ${tolerance.minCandidateKeyOverlapRatio.toFixed(3)})`
    )
  }

  if (curatedKeyOverlap !== null && curatedKeyOverlap < tolerance.minCuratedKeyOverlapRatio) {
    failureReasons.push(
      `curated_key_overlap_below_threshold (${curatedKeyOverlap.toFixed(3)} < ${tolerance.minCuratedKeyOverlapRatio.toFixed(3)})`
    )
  }

  return {
    version: REPLAY_DETERMINISM_VERSION,
    passed: failureReasons.length === 0,
    candidateDelta: {
      baseline: baselineCounts.total,
      replay: replayCounts.total,
      delta: candidateDelta,
      allowed: candidateDeltaAllowed,
    },
    curatedDelta: {
      baseline: baselineCounts.curated,
      replay: replayCounts.curated,
      delta: curatedDelta,
      allowed: curatedDeltaAllowed,
    },
    qualityFilteredDelta: {
      baseline: baselineCounts.qualityFiltered,
      replay: replayCounts.qualityFiltered,
      delta: qualityFilteredDelta,
      allowed: qualityFilteredDeltaAllowed,
    },
    overlap: {
      candidateKeys: candidateKeyOverlap,
      curatedCandidateKeys: curatedKeyOverlap,
    },
    tolerance,
    failureReasons,
  }
}

const resolveReplayRuntime = async (params: {
  durable: DurableStoreRepository
  sourceKey: string
  requestedConfigVersion: string | null
  warnings: string[]
}): Promise<{
  runtime: SourceRegistryRuntimeRecord | null
  resolvedConfigVersion: string | null
  resolvedFrom: "audit_event" | "current_registry" | "current_runtime"
}> => {
  if (params.requestedConfigVersion) {
    const historicalSnapshot = await params.durable.getSourceRuntimeByConfigVersion(
      params.sourceKey,
      params.requestedConfigVersion
    )

    if (historicalSnapshot) {
      return {
        runtime: historicalSnapshot.runtime,
        resolvedConfigVersion: historicalSnapshot.runtime.configVersion,
        resolvedFrom: historicalSnapshot.resolvedFrom,
      }
    }

    params.warnings.push(
      `Config version "${params.requestedConfigVersion}" was not found in source registry audit history for "${params.sourceKey}". Falling back to current runtime config.`
    )
  }

  const currentRuntime = await params.durable.getSourceRegistryRuntime(params.sourceKey)
  return {
    runtime: currentRuntime,
    resolvedConfigVersion: currentRuntime?.configVersion ?? null,
    resolvedFrom: "current_runtime",
  }
}

export async function replayRun(
  runId: string,
  options: ReplayRunOptions = {}
): Promise<ReplayRunResult> {
  const config = loadConfig()
  assertIngestConfig(config)

  const logger = createLogger(config.logLevel, `replay-run:${runId}`)
  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )
  const durable = new DurableStoreRepository(ingestClient, logger)

  const originalRun = await durable.getRunById(runId)
  if (!originalRun) {
    throw new Error(`Run not found for replay: ${runId}`)
  }

  if (originalRun.status === "running") {
    throw new Error(`Run ${runId} is still in progress and cannot be replayed yet`)
  }

  const defaultConfigVersion = extractSourceConfigVersionFromRunMeta(originalRun.metaJson)
  const overrideConfigVersion = asNonEmptyString(options.configVersionOverride)
  const requestedConfigVersion = overrideConfigVersion ?? defaultConfigVersion
  const overrideApplied =
    Boolean(overrideConfigVersion) && overrideConfigVersion !== defaultConfigVersion

  const warnings: string[] = []

  const resolvedRuntime = await resolveReplayRuntime({
    durable,
    sourceKey: originalRun.sourceKey,
    requestedConfigVersion,
    warnings,
  })

  if (overrideApplied && overrideConfigVersion !== resolvedRuntime.resolvedConfigVersion) {
    warnings.push(
      `Replay override requested config version "${overrideConfigVersion}" but resolved config version was "${resolvedRuntime.resolvedConfigVersion ?? "unknown"}".`
    )
  }

  const replayResult = await runSource(originalRun.sourceKey, {
    mode: "replay",
    respectCadence: false,
    force: options.force ?? true,
    runtimeOverride: resolvedRuntime.runtime,
    replay: {
      originalRunId: runId,
      requestedConfigVersion,
      defaultConfigVersion,
      resolvedConfigVersion: resolvedRuntime.resolvedConfigVersion,
      configResolvedFrom: resolvedRuntime.resolvedFrom,
      overrideApplied,
      overrideReason: overrideApplied ? "cli_config_version_override" : null,
    },
  })

  const [baselineCandidates, replayCandidates] = await Promise.all([
    durable.listCandidatesByRun(runId),
    durable.listCandidatesByRun(replayResult.runId),
  ])

  const determinism = evaluateReplayDeterminism({
    originalCandidates: baselineCandidates,
    replayCandidates,
    tolerance: options.tolerance,
  })

  if (determinism.passed) {
    logger.info("Replay determinism check passed", {
      original_run_id: runId,
      replay_run_id: replayResult.runId,
      source_key: originalRun.sourceKey,
      overlap: determinism.overlap,
      candidate_delta: determinism.candidateDelta,
      curated_delta: determinism.curatedDelta,
    })
  } else {
    logger.warn("Replay determinism check failed", {
      original_run_id: runId,
      replay_run_id: replayResult.runId,
      source_key: originalRun.sourceKey,
      failure_reasons: determinism.failureReasons,
      overlap: determinism.overlap,
      candidate_delta: determinism.candidateDelta,
      curated_delta: determinism.curatedDelta,
      quality_filtered_delta: determinism.qualityFilteredDelta,
    })
  }

  return {
    originalRunId: runId,
    replayRunId: replayResult.runId,
    sourceKey: originalRun.sourceKey,
    originalRunStatus: originalRun.status,
    defaultConfigVersion,
    requestedConfigVersion,
    resolvedConfigVersion: resolvedRuntime.resolvedConfigVersion,
    configResolvedFrom: resolvedRuntime.resolvedFrom,
    overrideApplied,
    replay: replayResult,
    determinism,
    warnings,
  }
}
