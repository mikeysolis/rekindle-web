import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import type { SourceHealthStatus, SourceModule, SourceModuleContext } from "../core/types.js"
import {
  DurableStoreRepository,
  type IngestPage,
  type RunStatus,
} from "../durable-store/repository.js"
import { createSnapshotWriter } from "../durable-store/snapshot-writer.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
  assertHealthCheckResultContract,
  assertSourceModuleContract,
} from "../sources/contract.js"
import { getSourceByKey } from "../sources/registry.js"
import {
  computeSourceHealthPatch,
  createOperationRateLimiter,
  evaluateCadence,
  filterUrlsByPatterns,
  resolveSourceRuntimePolicy,
  runWithRetry,
} from "./runtime-controls.js"
import {
  STRATEGY_SELECTION_VERSION,
  filterPagesForStrategy,
  mergeStrategyPerformanceMetadata,
  selectStrategyPlan,
  type IngestStrategy,
  type StrategyExecutionAttempt,
} from "./strategy-selection.js"
import {
  evaluateLifecycleAutomation,
  mergeLifecycleAlertMetadata,
} from "./lifecycle-automation.js"

export interface RunSourceOptions {
  respectCadence?: boolean
  force?: boolean
}

export interface RunSourceResult {
  runId: string
  sourceKey: string
  discoveredPages: number
  extractedPages: number
  failedPages: number
  candidateCount: number
  curatedCandidateCount: number
  qualityFilteredCandidateCount: number
  snapshotLocation: string
  skippedByCadence: boolean
  cadenceNextRunAt: string | null
  runtimePolicy: {
    maxRps: number
    maxConcurrency: number
    timeoutSeconds: number
    retryMaxAttempts: number
  }
}

type FinalRunStatus = Exclude<RunStatus, "running">

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const readExtractorVersion = (diagnostics: unknown): string | null => {
  const record = asRecord(diagnostics)
  const extractorVersion = record.extractor_version
  if (typeof extractorVersion === "string" && extractorVersion.trim().length > 0) {
    return extractorVersion
  }
  return null
}

const nextConfigVersion = (currentVersion: string, nowIso: string): string => {
  const trimmed = currentVersion.trim()
  const parsed = Number.parseInt(trimmed, 10)
  if (Number.isFinite(parsed) && String(parsed) === trimmed) {
    return String(parsed + 1)
  }

  const stamp = nowIso.replace(/[-:.TZ]/g, "").slice(0, 14)
  const base = trimmed.length > 0 ? trimmed : "1"
  return `${base}-auto-${stamp}`
}

const extractPage = async (params: {
  page: IngestPage
  source: SourceModule
  sourceKey: string
  sourceContext: SourceModuleContext
  timeoutMs: number
  retryMaxAttempts: number
  retryBackoffMs: number
  retryBackoffMultiplier: number
  durable: DurableStoreRepository
}): Promise<{
  extracted: boolean
  storedCount: number
  curatedCount: number
  qualityFilteredCount: number
}> => {
  const { page, source, sourceKey, sourceContext, timeoutMs, retryMaxAttempts, retryBackoffMs, retryBackoffMultiplier, durable } =
    params

  const extraction = await runWithRetry({
    operationLabel: `extract:${sourceKey}:${page.id}`,
    timeoutMs,
    maxAttempts: retryMaxAttempts,
    backoffMs: retryBackoffMs,
    backoffMultiplier: retryBackoffMultiplier,
    logger: sourceContext.logger,
    operation: () =>
      source.extract(sourceContext, {
        sourceKey,
        url: page.url,
      }),
  })

  assertExtractedCandidatesContract(source, extraction.value)

  const storedCandidates = await durable.upsertCandidates(params.page.run_id, page.id, extraction.value)
  await durable.markPageExtracted(page.id)

  const curatedCount = storedCandidates.filter((candidate) => candidate.status === "curated").length
  const qualityFilteredCount = storedCandidates.filter(
    (candidate) => candidate.status === "normalized"
  ).length

  return {
    extracted: true,
    storedCount: storedCandidates.length,
    curatedCount,
    qualityFilteredCount,
  }
}

export async function runSource(
  sourceKey: string,
  options: RunSourceOptions = {}
): Promise<RunSourceResult> {
  const config = loadConfig()
  assertIngestConfig(config)

  const logger = createLogger(config.logLevel, `run-source:${sourceKey}`)
  const source = getSourceByKey(sourceKey)
  assertSourceModuleContract(source)

  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )
  const durable = new DurableStoreRepository(ingestClient, logger)
  const snapshotWriter = createSnapshotWriter(config, logger, ingestClient)

  const sourceRegistryRuntime = await durable.getSourceRegistryRuntime(sourceKey)
  if (!sourceRegistryRuntime) {
    logger.warn("Source is missing ingest_source_registry entry; runtime defaults applied", {
      sourceKey,
    })
  }

  const runtimePolicy = resolveSourceRuntimePolicy(sourceRegistryRuntime)
  const cadence = evaluateCadence(
    runtimePolicy.cadence,
    sourceRegistryRuntime?.lastRunAt ?? null
  )

  if (
    sourceRegistryRuntime &&
    (sourceRegistryRuntime.state === "paused" || sourceRegistryRuntime.state === "retired") &&
    !options.force
  ) {
    throw new Error(
      `Source "${sourceKey}" is ${sourceRegistryRuntime.state}. Use --force to run manually.`
    )
  }

  logger.info("Resolved source runtime policy", {
    sourceKey,
    policy: {
      cadence: runtimePolicy.cadence,
      max_rps: runtimePolicy.maxRps,
      max_concurrency: runtimePolicy.maxConcurrency,
      timeout_seconds: runtimePolicy.timeoutSeconds,
      retry_max_attempts: runtimePolicy.retryMaxAttempts,
      retry_backoff_ms: runtimePolicy.retryBackoffMs,
      retry_backoff_multiplier: runtimePolicy.retryBackoffMultiplier,
    },
    cadence,
    source_state: sourceRegistryRuntime?.state ?? "not_registered",
    approved_for_prod: sourceRegistryRuntime?.approvedForProd ?? null,
  })

  const run = await durable.createRun(sourceKey)
  const sourceContext: SourceModuleContext = {
    logger,
    defaultLocale: config.defaultLocale,
  }

  const operationLimiter = createOperationRateLimiter(runtimePolicy.maxRps)
  const operationTimeoutMs = runtimePolicy.timeoutSeconds * 1000

  let discoveredPages = 0
  let extractedPages = 0
  let failedPages = 0
  let candidateCount = 0
  let curatedCandidateCount = 0
  let qualityFilteredCandidateCount = 0
  let snapshotLocation = ""
  let skippedByCadence = false
  let finalRunStatus: FinalRunStatus = "failed"
  let runErrorMessage: string | null = null
  let sourceHealthStatus: SourceHealthStatus | null = null

  let droppedByInclude = 0
  let droppedByExclude = 0
  let invalidUrlPatternCount = 0
  let extractorVersion: string | null = null

  let strategyPlan: ReturnType<typeof selectStrategyPlan> | null = null
  let strategyAttempts: StrategyExecutionAttempt[] = []
  let primaryStrategy: IngestStrategy | null = null
  let effectiveStrategy: IngestStrategy | null = null
  let fallbackTriggered = false
  let unprocessedPageCount = 0

  try {
    if (options.respectCadence && !options.force && !cadence.isDue) {
      skippedByCadence = true
      snapshotLocation = await snapshotWriter.writeRunSnapshot({
        runId: run.id,
        sourceKey,
        candidates: [],
      })

      finalRunStatus = "success"
      await durable.finishRun(run.id, finalRunStatus, {
        skipped_by_cadence: true,
        cadence,
        runtime_policy: {
          max_rps: runtimePolicy.maxRps,
          max_concurrency: runtimePolicy.maxConcurrency,
          timeout_seconds: runtimePolicy.timeoutSeconds,
          retry_max_attempts: runtimePolicy.retryMaxAttempts,
        },
        snapshot_location: snapshotLocation,
      })

      return {
        runId: run.id,
        sourceKey,
        discoveredPages,
        extractedPages,
        failedPages,
        candidateCount,
        curatedCandidateCount,
        qualityFilteredCandidateCount,
        snapshotLocation,
        skippedByCadence,
        cadenceNextRunAt: cadence.nextRunAt,
        runtimePolicy: {
          maxRps: runtimePolicy.maxRps,
          maxConcurrency: runtimePolicy.maxConcurrency,
          timeoutSeconds: runtimePolicy.timeoutSeconds,
          retryMaxAttempts: runtimePolicy.retryMaxAttempts,
        },
      }
    }

    if (!options.respectCadence && !cadence.isDue) {
      logger.info("Cadence window not due, but proceeding with manual run", {
        sourceKey,
        cadence,
      })
    }

    if (options.force && !cadence.isDue) {
      logger.info("Cadence bypassed via --force", {
        sourceKey,
        cadence,
      })
    }

    await operationLimiter.waitTurn()
    const health = await runWithRetry({
      operationLabel: `healthCheck:${sourceKey}`,
      timeoutMs: operationTimeoutMs,
      maxAttempts: runtimePolicy.retryMaxAttempts,
      backoffMs: runtimePolicy.retryBackoffMs,
      backoffMultiplier: runtimePolicy.retryBackoffMultiplier,
      logger,
      operation: () => source.healthCheck(sourceContext),
    })

    assertHealthCheckResultContract(source, health.value)
    sourceHealthStatus = health.value.status
    extractorVersion = readExtractorVersion(health.value.diagnostics)

    if (health.value.status === "failed") {
      throw new Error(`Source health check failed for "${sourceKey}"`)
    }

    if (health.value.status === "degraded") {
      logger.warn("Source health check returned degraded", {
        sourceKey,
        health: health.value,
      })
    } else {
      logger.info("Source health check passed", {
        sourceKey,
        health: health.value,
      })
    }

    await operationLimiter.waitTurn()
    const discovered = await runWithRetry({
      operationLabel: `discover:${sourceKey}`,
      timeoutMs: operationTimeoutMs,
      maxAttempts: runtimePolicy.retryMaxAttempts,
      backoffMs: runtimePolicy.retryBackoffMs,
      backoffMultiplier: runtimePolicy.retryBackoffMultiplier,
      logger,
      operation: () => source.discover(sourceContext),
    })

    assertDiscoveredPagesContract(source, discovered.value)

    const dedupedUrls = [...new Set(discovered.value.map((page) => page.url))]
    const filteredUrls = filterUrlsByPatterns(
      dedupedUrls,
      runtimePolicy.includeUrlPatterns,
      runtimePolicy.excludeUrlPatterns
    )

    droppedByInclude = filteredUrls.droppedByInclude
    droppedByExclude = filteredUrls.droppedByExclude
    invalidUrlPatternCount = filteredUrls.invalidPatternCount

    if (droppedByInclude > 0 || droppedByExclude > 0 || invalidUrlPatternCount > 0) {
      logger.info("Applied source URL pattern filters", {
        sourceKey,
        discovered_count: dedupedUrls.length,
        accepted_count: filteredUrls.accepted.length,
        dropped_by_include: droppedByInclude,
        dropped_by_exclude: droppedByExclude,
        invalid_pattern_count: invalidUrlPatternCount,
      })
    }

    const pages = await durable.insertDiscoveredPages(run.id, sourceKey, filteredUrls.accepted)
    discoveredPages = pages.length

    strategyPlan = selectStrategyPlan({
      sourceKey,
      configuredOrder: sourceRegistryRuntime?.strategyOrder ?? [],
      discoveredUrls: pages.map((page) => page.url),
      metadataJson: sourceRegistryRuntime?.metadataJson ?? {},
      legalRiskLevel: sourceRegistryRuntime?.legalRiskLevel ?? null,
    })

    primaryStrategy = strategyPlan.selectedPrimary
    logger.info("Resolved strategy selection plan", {
      sourceKey,
      configured_order: strategyPlan.configuredOrder,
      ranked_order: strategyPlan.rankedOrder,
      selected_primary: strategyPlan.selectedPrimary,
      strategy_scores: strategyPlan.scores,
      reasoning: strategyPlan.reasoning,
    })

    const unprocessedIds = new Set(pages.map((page) => page.id))

    for (let strategyIndex = 0; strategyIndex < strategyPlan.rankedOrder.length; strategyIndex += 1) {
      const strategy = strategyPlan.rankedOrder[strategyIndex]
      const strategyPages = filterPagesForStrategy(
        pages.filter((page) => unprocessedIds.has(page.id)),
        strategy
      )

      const startedAt = new Date().toISOString()
      const startedMs = Date.now()

      if (strategyPages.length === 0) {
        if (strategyIndex > 0) {
          fallbackTriggered = true
        }

        const priorAttemptStatus = strategyAttempts.at(-1)?.status
        strategyAttempts.push({
          strategy,
          status: "no_pages",
          pagesConsidered: 0,
          pagesSucceeded: 0,
          pagesFailed: 0,
          candidateCount: 0,
          curatedCandidateCount: 0,
          qualityFilteredCandidateCount: 0,
          startedAt,
          finishedAt: startedAt,
          durationMs: 0,
          fallbackReason:
            strategyIndex === 0
              ? null
              : priorAttemptStatus === "no_pages"
                ? "primary_no_matching_pages"
                : "primary_underperformed",
        })
        continue
      }

      if (strategyIndex > 0) {
        fallbackTriggered = true
      }

      const queue = [...strategyPages]
      const workerCount = Math.min(runtimePolicy.maxConcurrency, Math.max(1, queue.length))

      let strategyExtractedPages = 0
      let strategyFailedPages = 0
      let strategyCandidateCount = 0
      let strategyCuratedCount = 0
      let strategyQualityFilteredCount = 0

      const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
          const page = queue.shift()
          if (!page) {
            return
          }

          await operationLimiter.waitTurn()

          try {
            const extractionResult = await extractPage({
              page,
              source,
              sourceKey,
              sourceContext,
              timeoutMs: operationTimeoutMs,
              retryMaxAttempts: runtimePolicy.retryMaxAttempts,
              retryBackoffMs: runtimePolicy.retryBackoffMs,
              retryBackoffMultiplier: runtimePolicy.retryBackoffMultiplier,
              durable,
            })

            if (extractionResult.extracted) {
              strategyExtractedPages += 1
              strategyCandidateCount += extractionResult.storedCount
              strategyCuratedCount += extractionResult.curatedCount
              strategyQualityFilteredCount += extractionResult.qualityFilteredCount
            }
          } catch (error) {
            strategyFailedPages += 1
            const message = error instanceof Error ? error.message : String(error)

            logger.warn("Page extraction failed", {
              pageId: page.id,
              url: page.url,
              error: message,
              strategy,
            })

            await durable.markPageFailed(page.id, message)
          }
        }
      })

      await Promise.all(workers)

      extractedPages += strategyExtractedPages
      failedPages += strategyFailedPages
      candidateCount += strategyCandidateCount
      curatedCandidateCount += strategyCuratedCount
      qualityFilteredCandidateCount += strategyQualityFilteredCount

      const finishedAt = new Date().toISOString()
      const durationMs = Date.now() - startedMs

      let status: StrategyExecutionAttempt["status"]
      if (strategyFailedPages === strategyPages.length && strategyPages.length > 0) {
        status = "failed"
      } else if (strategyCandidateCount > 0 && strategyFailedPages === 0) {
        status = "success"
      } else if (strategyCandidateCount > 0 || strategyExtractedPages > 0) {
        status = strategyCandidateCount > 0 ? "partial" : "no_candidates"
      } else {
        status = "failed"
      }

      strategyAttempts.push({
        strategy,
        status,
        pagesConsidered: strategyPages.length,
        pagesSucceeded: strategyExtractedPages,
        pagesFailed: strategyFailedPages,
        candidateCount: strategyCandidateCount,
        curatedCandidateCount: strategyCuratedCount,
        qualityFilteredCandidateCount: strategyQualityFilteredCount,
        startedAt,
        finishedAt,
        durationMs,
        fallbackReason:
          strategyIndex === 0
            ? null
            : strategyAttempts.at(-1)?.status === "no_pages"
              ? "primary_no_matching_pages"
              : "primary_underperformed",
      })

      if (strategyCandidateCount > 0) {
        for (const page of strategyPages) {
          unprocessedIds.delete(page.id)
        }
        effectiveStrategy = strategy
        break
      }
    }

    unprocessedPageCount = unprocessedIds.size

    const runCandidates = await durable.listCandidatesByRun(run.id)
    candidateCount = runCandidates.length
    curatedCandidateCount = runCandidates.filter((candidate) => candidate.status === "curated").length
    qualityFilteredCandidateCount = runCandidates.filter(
      (candidate) => candidate.status === "normalized"
    ).length

    snapshotLocation = await snapshotWriter.writeRunSnapshot({
      runId: run.id,
      sourceKey,
      candidates: runCandidates,
    })

    finalRunStatus = failedPages > 0 ? "partial" : "success"

    const strategySelectionMeta = {
      version: STRATEGY_SELECTION_VERSION,
      source_config_version: sourceRegistryRuntime?.configVersion ?? null,
      configured_order: strategyPlan?.configuredOrder ?? [],
      ranked_order: strategyPlan?.rankedOrder ?? [],
      selected_primary: primaryStrategy,
      selected_effective: effectiveStrategy,
      fallback_triggered: fallbackTriggered,
      unprocessed_page_count: unprocessedPageCount,
      reasoning: strategyPlan?.reasoning ?? [],
      scores: strategyPlan?.scores ?? [],
      attempts: strategyAttempts,
    }

    await durable.finishRun(run.id, finalRunStatus, {
      discovered_pages: discoveredPages,
      extracted_pages: extractedPages,
      failed_pages: failedPages,
      candidates: runCandidates.length,
      curated_candidates: curatedCandidateCount,
      quality_filtered_candidates: qualityFilteredCandidateCount,
      dropped_by_include: droppedByInclude,
      dropped_by_exclude: droppedByExclude,
      invalid_url_pattern_count: invalidUrlPatternCount,
      source_health_status: sourceHealthStatus,
      extractor_version: extractorVersion,
      strategy_selection: strategySelectionMeta,
      cadence,
      runtime_policy: {
        max_rps: runtimePolicy.maxRps,
        max_concurrency: runtimePolicy.maxConcurrency,
        timeout_seconds: runtimePolicy.timeoutSeconds,
        retry_max_attempts: runtimePolicy.retryMaxAttempts,
        retry_backoff_ms: runtimePolicy.retryBackoffMs,
        retry_backoff_multiplier: runtimePolicy.retryBackoffMultiplier,
      },
      snapshot_location: snapshotLocation,
    })

    return {
      runId: run.id,
      sourceKey,
      discoveredPages,
      extractedPages,
      failedPages,
      candidateCount: runCandidates.length,
      curatedCandidateCount,
      qualityFilteredCandidateCount,
      snapshotLocation,
      skippedByCadence,
      cadenceNextRunAt: cadence.nextRunAt,
      runtimePolicy: {
        maxRps: runtimePolicy.maxRps,
        maxConcurrency: runtimePolicy.maxConcurrency,
        timeoutSeconds: runtimePolicy.timeoutSeconds,
        retryMaxAttempts: runtimePolicy.retryMaxAttempts,
      },
    }
  } catch (error) {
    runErrorMessage = error instanceof Error ? error.message : String(error)
    finalRunStatus = "failed"

    const strategySelectionMeta = {
      version: STRATEGY_SELECTION_VERSION,
      source_config_version: sourceRegistryRuntime?.configVersion ?? null,
      configured_order: strategyPlan?.configuredOrder ?? [],
      ranked_order: strategyPlan?.rankedOrder ?? [],
      selected_primary: primaryStrategy,
      selected_effective: effectiveStrategy,
      fallback_triggered: fallbackTriggered,
      unprocessed_page_count: unprocessedPageCount,
      reasoning: strategyPlan?.reasoning ?? [],
      scores: strategyPlan?.scores ?? [],
      attempts: strategyAttempts,
    }

    await durable.finishRun(run.id, finalRunStatus, {
      discovered_pages: discoveredPages,
      extracted_pages: extractedPages,
      failed_pages: failedPages,
      candidates: candidateCount,
      curated_candidates: curatedCandidateCount,
      quality_filtered_candidates: qualityFilteredCandidateCount,
      dropped_by_include: droppedByInclude,
      dropped_by_exclude: droppedByExclude,
      invalid_url_pattern_count: invalidUrlPatternCount,
      source_health_status: sourceHealthStatus,
      extractor_version: extractorVersion,
      strategy_selection: strategySelectionMeta,
      cadence,
      runtime_policy: {
        max_rps: runtimePolicy.maxRps,
        max_concurrency: runtimePolicy.maxConcurrency,
        timeout_seconds: runtimePolicy.timeoutSeconds,
        retry_max_attempts: runtimePolicy.retryMaxAttempts,
        retry_backoff_ms: runtimePolicy.retryBackoffMs,
        retry_backoff_multiplier: runtimePolicy.retryBackoffMultiplier,
      },
      error: runErrorMessage,
    })

    throw error
  } finally {
    if (sourceRegistryRuntime) {
      try {
        const nowIso = new Date().toISOString()
        const patch = computeSourceHealthPatch({
          nowIso,
          status: finalRunStatus,
          discoveredPages,
          extractedPages,
          failedPages,
          candidateCount,
          curatedCandidateCount,
          qualityFilteredCandidateCount,
          skippedByCadence,
          runError: runErrorMessage,
          policy: runtimePolicy,
          prior: {
            lastSuccessAt: sourceRegistryRuntime.lastSuccessAt,
            rollingPromotionRate30d: sourceRegistryRuntime.rollingPromotionRate30d,
            rollingFailureRate30d: sourceRegistryRuntime.rollingFailureRate30d,
            metadataJson: sourceRegistryRuntime.metadataJson,
          },
        })

        patch.metadataJson = mergeStrategyPerformanceMetadata(
          patch.metadataJson,
          strategyAttempts
        )

        const lifecycleDecision = evaluateLifecycleAutomation({
          sourceKey,
          state: sourceRegistryRuntime.state,
          cadence: sourceRegistryRuntime.cadence,
          skippedByCadence,
          finalRunStatus,
          rollingFailureRate30d: patch.rollingFailureRate30d,
          rollingPromotionRate30d: patch.rollingPromotionRate30d,
          metadataJson: patch.metadataJson,
          nowIso,
        })

        if (lifecycleDecision.evidenceBundle) {
          patch.metadataJson = mergeLifecycleAlertMetadata({
            metadataJson: patch.metadataJson,
            evidenceBundle: lifecycleDecision.evidenceBundle,
            transitionedToDegraded: lifecycleDecision.shouldTransitionToDegraded,
            downgradedCadence: lifecycleDecision.shouldDowngradeCadence,
            nowIso,
          })

          const logMethod =
            lifecycleDecision.alertSeverity === "critical" ? logger.error : logger.warn

          logMethod("Lifecycle automation alert", lifecycleDecision.evidenceBundle)
        }

        const updated = await durable.updateSourceRegistryRuntime(sourceKey, patch)
        if (!updated) {
          logger.warn("Source runtime health patch skipped because source registry row was not found", {
            sourceKey,
          })
        } else {
          if (lifecycleDecision.shouldTransitionToDegraded) {
            const reason = lifecycleDecision.reason ?? "Lifecycle automation degraded source"
            await durable.setSourceLifecycleState({
              sourceKey,
              state: "degraded",
              reason,
              actorUserId: null,
            })

            logger.warn("Lifecycle automation transitioned source to degraded", {
              sourceKey,
              reason,
              trigger_codes: lifecycleDecision.triggerCodes,
            })
          }

          if (lifecycleDecision.shouldDowngradeCadence && lifecycleDecision.degradedCadence) {
            const targetVersion = nextConfigVersion(sourceRegistryRuntime.configVersion, nowIso)
            const reason =
              lifecycleDecision.reason ??
              "Lifecycle automation downgraded cadence for degraded source"

            await durable.updateSourceConfig({
              sourceKey,
              patch: {
                cadence: lifecycleDecision.degradedCadence,
              },
              configVersion: targetVersion,
              reason,
              actorUserId: null,
            })

            logger.warn("Lifecycle automation downgraded source cadence", {
              sourceKey,
              previous_cadence: sourceRegistryRuntime.cadence,
              new_cadence: lifecycleDecision.degradedCadence,
              config_version: targetVersion,
            })
          }
        }
      } catch (error) {
        logger.warn("Failed to update source runtime health metrics", {
          sourceKey,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
}
