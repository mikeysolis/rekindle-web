import { createServiceRoleClient, type GenericSupabaseClient } from "../clients/supabase.js"
import {
  assertPromotionReconciliationConfig,
  loadConfig,
} from "../config/env.js"
import { createLogger } from "../core/logger.js"

type DraftLinkRow = {
  id: string
  ingest_candidate_id: string | null
}

type CandidateRow = {
  id: string
  status: string | null
}

type SyncLogRow = {
  candidate_id: string
  target_id: string | null
}

export interface PromotionDraftLink {
  draftId: string
  candidateId: string
}

export interface PromotionCandidateProjection {
  candidateId: string
  status: string | null
}

export interface PromotionSyncSuccessProjection {
  candidateId: string
  targetId: string | null
}

export interface PromotionReconciliationPlan {
  scannedDraftCount: number
  missingCandidateCount: number
  statusRepairCandidateIds: string[]
  syncLogRepairs: Array<{
    candidateId: string
    draftId: string
  }>
}

export interface ReconcilePromotionsResult {
  startedAt: string
  finishedAt: string
  scannedDraftCount: number
  missingCandidateCount: number
  plannedStatusRepairs: number
  plannedSyncLogRepairs: number
  repairedCandidateStatusCount: number
  repairedSyncLogCount: number
  failedCandidateStatusRepairs: number
  failedSyncLogRepairs: number
  totalRepairs: number
  spikeThreshold: number
  spikeDetected: boolean
}

const APP_DRAFT_TARGET_SYSTEM = "app_draft"

const chunk = <T>(values: T[], size: number): T[][] => {
  if (values.length === 0) return []

  const output: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size))
  }
  return output
}

export function buildPromotionReconciliationPlan(params: {
  drafts: PromotionDraftLink[]
  candidates: PromotionCandidateProjection[]
  successLogs: PromotionSyncSuccessProjection[]
}): PromotionReconciliationPlan {
  const candidateById = new Map(params.candidates.map((candidate) => [candidate.candidateId, candidate]))
  const successTargetsByCandidate = new Map<string, Set<string>>()
  for (const row of params.successLogs) {
    if (!row.targetId) {
      continue
    }
    const current = successTargetsByCandidate.get(row.candidateId) ?? new Set<string>()
    current.add(row.targetId)
    successTargetsByCandidate.set(row.candidateId, current)
  }

  const statusRepairCandidateIds = new Set<string>()
  const syncRepairDedup = new Set<string>()
  const syncLogRepairs: Array<{ candidateId: string; draftId: string }> = []
  let missingCandidateCount = 0

  for (const draft of params.drafts) {
    const candidate = candidateById.get(draft.candidateId)
    if (!candidate) {
      missingCandidateCount += 1
      continue
    }

    if (candidate.status !== "pushed_to_studio") {
      statusRepairCandidateIds.add(draft.candidateId)
    }

    const successTargets = successTargetsByCandidate.get(draft.candidateId)
    if (!successTargets || !successTargets.has(draft.draftId)) {
      const key = `${draft.candidateId}|${draft.draftId}`
      if (!syncRepairDedup.has(key)) {
        syncRepairDedup.add(key)
        syncLogRepairs.push({
          candidateId: draft.candidateId,
          draftId: draft.draftId,
        })
      }
    }
  }

  return {
    scannedDraftCount: params.drafts.length,
    missingCandidateCount,
    statusRepairCandidateIds: Array.from(statusRepairCandidateIds),
    syncLogRepairs,
  }
}

async function listPromotionDraftLinks(
  appClient: GenericSupabaseClient,
  pageSize: number
): Promise<PromotionDraftLink[]> {
  const output: PromotionDraftLink[] = []
  let offset = 0

  while (true) {
    const { data, error } = await appClient
      .from("idea_drafts")
      .select("id, ingest_candidate_id")
      .not("ingest_candidate_id", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to list app drafts for reconciliation: ${error.message}`)
    }

    const rows = (data ?? []) as DraftLinkRow[]
    if (rows.length === 0) {
      break
    }

    for (const row of rows) {
      if (!row.ingest_candidate_id) {
        continue
      }
      output.push({
        draftId: row.id,
        candidateId: row.ingest_candidate_id,
      })
    }

    if (rows.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return output
}

async function listCandidatesByIds(
  ingestClient: GenericSupabaseClient,
  candidateIds: string[],
  pageSize: number
): Promise<PromotionCandidateProjection[]> {
  const output: PromotionCandidateProjection[] = []

  for (const batch of chunk(candidateIds, pageSize)) {
    const { data, error } = await ingestClient
      .from("ingest_candidates")
      .select("id, status")
      .in("id", batch)

    if (error) {
      throw new Error(`Failed to load ingestion candidates for reconciliation: ${error.message}`)
    }

    for (const row of (data ?? []) as CandidateRow[]) {
      output.push({
        candidateId: row.id,
        status: row.status,
      })
    }
  }

  return output
}

async function listSuccessSyncLogsByCandidateIds(
  ingestClient: GenericSupabaseClient,
  candidateIds: string[],
  pageSize: number
): Promise<PromotionSyncSuccessProjection[]> {
  const output: PromotionSyncSuccessProjection[] = []

  for (const batch of chunk(candidateIds, pageSize)) {
    const { data, error } = await ingestClient
      .from("ingest_sync_log")
      .select("candidate_id, target_id")
      .eq("target_system", APP_DRAFT_TARGET_SYSTEM)
      .eq("status", "success")
      .in("candidate_id", batch)

    if (error) {
      throw new Error(`Failed to load sync log rows for reconciliation: ${error.message}`)
    }

    for (const row of (data ?? []) as SyncLogRow[]) {
      output.push({
        candidateId: row.candidate_id,
        targetId: row.target_id,
      })
    }
  }

  return output
}

export async function reconcilePromotions(): Promise<ReconcilePromotionsResult> {
  const config = loadConfig()
  assertPromotionReconciliationConfig(config)

  const logger = createLogger(config.logLevel, "reconcile-promotions")
  const ingestClient = createServiceRoleClient(
    config.ingestSupabaseUrl,
    config.ingestSupabaseServiceRoleKey
  )
  const appClient = createServiceRoleClient(
    config.appSupabaseUrl,
    config.appSupabaseServiceRoleKey
  )

  const startedAt = new Date().toISOString()

  const draftLinks = await listPromotionDraftLinks(appClient, config.reconciliationPageSize)
  const uniqueCandidateIds = Array.from(new Set(draftLinks.map((draft) => draft.candidateId)))

  const [candidates, successLogs] = await Promise.all([
    listCandidatesByIds(ingestClient, uniqueCandidateIds, config.reconciliationPageSize),
    listSuccessSyncLogsByCandidateIds(ingestClient, uniqueCandidateIds, config.reconciliationPageSize),
  ])

  const plan = buildPromotionReconciliationPlan({
    drafts: draftLinks,
    candidates,
    successLogs,
  })

  const draftIdByCandidateId = new Map<string, string>()
  for (const draft of draftLinks) {
    if (!draftIdByCandidateId.has(draft.candidateId)) {
      draftIdByCandidateId.set(draft.candidateId, draft.draftId)
    }
  }

  let repairedCandidateStatusCount = 0
  let repairedSyncLogCount = 0
  let failedCandidateStatusRepairs = 0
  let failedSyncLogRepairs = 0

  for (const candidateId of plan.statusRepairCandidateIds) {
    const { error } = await ingestClient
      .from("ingest_candidates")
      .update({ status: "pushed_to_studio" })
      .eq("id", candidateId)

    if (error) {
      failedCandidateStatusRepairs += 1
      logger.error("Promotion reconciliation failed to repair candidate status", {
        candidateId,
        error: error.message,
      })
      continue
    }

    repairedCandidateStatusCount += 1
    logger.info("Promotion reconciliation repaired candidate status", {
      candidateId,
      draftId: draftIdByCandidateId.get(candidateId) ?? null,
    })
  }

  for (const repair of plan.syncLogRepairs) {
    const { error } = await ingestClient.from("ingest_sync_log").insert({
      candidate_id: repair.candidateId,
      target_system: APP_DRAFT_TARGET_SYSTEM,
      target_id: repair.draftId,
      status: "success",
      error_text: null,
    })

    if (error) {
      failedSyncLogRepairs += 1
      logger.error("Promotion reconciliation failed to repair sync log", {
        candidateId: repair.candidateId,
        draftId: repair.draftId,
        error: error.message,
      })
      continue
    }

    repairedSyncLogCount += 1
    logger.info("Promotion reconciliation repaired sync log", {
      candidateId: repair.candidateId,
      draftId: repair.draftId,
    })
  }

  const totalRepairs = repairedCandidateStatusCount + repairedSyncLogCount
  const spikeDetected = totalRepairs >= config.reconciliationSpikeThreshold
  if (spikeDetected) {
    logger.warn("Promotion reconciliation repair spike detected", {
      totalRepairs,
      spikeThreshold: config.reconciliationSpikeThreshold,
      scannedDraftCount: plan.scannedDraftCount,
    })
  }

  const finishedAt = new Date().toISOString()
  const result: ReconcilePromotionsResult = {
    startedAt,
    finishedAt,
    scannedDraftCount: plan.scannedDraftCount,
    missingCandidateCount: plan.missingCandidateCount,
    plannedStatusRepairs: plan.statusRepairCandidateIds.length,
    plannedSyncLogRepairs: plan.syncLogRepairs.length,
    repairedCandidateStatusCount,
    repairedSyncLogCount,
    failedCandidateStatusRepairs,
    failedSyncLogRepairs,
    totalRepairs,
    spikeThreshold: config.reconciliationSpikeThreshold,
    spikeDetected,
  }

  logger.info("Promotion reconciliation completed", result)
  return result
}
