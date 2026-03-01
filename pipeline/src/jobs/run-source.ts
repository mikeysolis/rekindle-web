import { createServiceRoleClient } from "../clients/supabase.js"
import { assertIngestConfig, loadConfig } from "../config/env.js"
import { createLogger } from "../core/logger.js"
import type { SourceModuleContext } from "../core/types.js"
import { DurableStoreRepository } from "../durable-store/repository.js"
import { createSnapshotWriter } from "../durable-store/snapshot-writer.js"
import {
  assertDiscoveredPagesContract,
  assertExtractedCandidatesContract,
  assertHealthCheckResultContract,
  assertSourceModuleContract,
} from "../sources/contract.js"
import { getSourceByKey } from "../sources/registry.js"

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
}

export async function runSource(sourceKey: string): Promise<RunSourceResult> {
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

  const run = await durable.createRun(sourceKey)
  const sourceContext: SourceModuleContext = {
    logger,
    defaultLocale: config.defaultLocale,
  }

  let discoveredPages = 0
  let extractedPages = 0
  let failedPages = 0
  let candidateCount = 0
  let curatedCandidateCount = 0
  let qualityFilteredCandidateCount = 0

  try {
    const health = await source.healthCheck(sourceContext)
    assertHealthCheckResultContract(source, health)
    if (health.status === "failed") {
      throw new Error(`Source health check failed for "${sourceKey}"`)
    }
    if (health.status === "degraded") {
      logger.warn("Source health check returned degraded", {
        sourceKey,
        health,
      })
    } else {
      logger.info("Source health check passed", {
        sourceKey,
        health,
      })
    }

    const discovered = await source.discover(sourceContext)
    assertDiscoveredPagesContract(source, discovered)
    const dedupedUrls = [...new Set(discovered.map((page) => page.url))]
    const pages = await durable.insertDiscoveredPages(run.id, sourceKey, dedupedUrls)
    discoveredPages = pages.length

    for (const page of pages) {
      try {
        const candidates = await source.extract(sourceContext, {
          sourceKey,
          url: page.url,
        })
        assertExtractedCandidatesContract(source, candidates)
        const storedCandidates = await durable.upsertCandidates(run.id, page.id, candidates)
        await durable.markPageExtracted(page.id)
        extractedPages += 1
        candidateCount += storedCandidates.length
        curatedCandidateCount += storedCandidates.filter((candidate) => candidate.status === "curated").length
        qualityFilteredCandidateCount += storedCandidates.filter(
          (candidate) => candidate.status === "normalized"
        ).length
      } catch (error) {
        failedPages += 1
        const message = error instanceof Error ? error.message : String(error)
        logger.warn("Page extraction failed", {
          pageId: page.id,
          url: page.url,
          error: message,
        })
        await durable.markPageFailed(page.id, message)
      }
    }

    const runCandidates = await durable.listCandidatesByRun(run.id)
    const snapshotLocation = await snapshotWriter.writeRunSnapshot({
      runId: run.id,
      sourceKey,
      candidates: runCandidates,
    })

    const status = failedPages > 0 ? "partial" : "success"
    await durable.finishRun(run.id, status, {
      discovered_pages: discoveredPages,
      extracted_pages: extractedPages,
      failed_pages: failedPages,
      candidates: runCandidates.length,
      curated_candidates: curatedCandidateCount,
      quality_filtered_candidates: qualityFilteredCandidateCount,
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
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await durable.finishRun(run.id, "failed", {
      discovered_pages: discoveredPages,
      extracted_pages: extractedPages,
      failed_pages: failedPages,
      candidates: candidateCount,
      curated_candidates: curatedCandidateCount,
      quality_filtered_candidates: qualityFilteredCandidateCount,
      error: message,
    })
    throw error
  }
}
