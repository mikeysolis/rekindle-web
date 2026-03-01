import type { GenericSupabaseClient } from "../clients/supabase.js"
import { buildCandidateKey } from "../core/hashing.js"
import { normalizeOptionalText } from "../core/normalize.js"
import {
  DEFAULT_QUALITY_THRESHOLD,
  QUALITY_RULE_VERSION,
  evaluateCandidateQuality,
} from "../core/quality.js"
import type { ExtractedCandidate, TraitHint } from "../core/types.js"
import type { Logger } from "../core/logger.js"

export type RunStatus = "running" | "success" | "partial" | "failed"
export type CandidateStatus =
  | "new"
  | "normalized"
  | "curated"
  | "pushed_to_studio"
  | "exported"
  | "rejected"

export interface IngestRun {
  id: string
  source_key: string
  status: RunStatus
}

export interface IngestPage {
  id: string
  run_id: string
  source_key: string
  url: string
  status: string
}

export interface StoredCandidate {
  id: string
  run_id: string
  page_id: string | null
  source_key: string
  source_url: string
  title: string
  description: string | null
  reason_snippet: string | null
  raw_excerpt: string | null
  candidate_key: string
  status: CandidateStatus
  meta_json: Record<string, unknown>
  traits: TraitHint[]
}

export interface SourceRegistryRuntimeRecord {
  sourceKey: string
  displayName: string
  state: string
  approvedForProd: boolean
  cadence: string | null
  maxRps: number | null
  maxConcurrency: number | null
  timeoutSeconds: number | null
  includeUrlPatterns: string[]
  excludeUrlPatterns: string[]
  lastRunAt: string | null
  lastSuccessAt: string | null
  rollingPromotionRate30d: number | null
  rollingFailureRate30d: number | null
  metadataJson: Record<string, unknown>
}

export interface SourceRegistryRuntimePatch {
  lastRunAt?: string | null
  lastSuccessAt?: string | null
  rollingPromotionRate30d?: number | null
  rollingFailureRate30d?: number | null
  metadataJson?: Record<string, unknown>
}

export interface SourceHealthRow {
  sourceKey: string
  displayName: string
  state: string
  approvedForProd: boolean
  cadence: string | null
  lastRunAt: string | null
  lastSuccessAt: string | null
  rollingPromotionRate30d: number | null
  rollingFailureRate30d: number | null
  metadataJson: Record<string, unknown>
}

type SyncStatus = "pending" | "success" | "failed"

const must = <T>(value: T | null, context: string): T => {
  if (value === null) {
    throw new Error(context)
  }
  return value
}

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const toSourceRegistryRuntimeRecord = (row: Record<string, unknown>): SourceRegistryRuntimeRecord => ({
  sourceKey: String(row.source_key ?? ""),
  displayName: String(row.display_name ?? ""),
  state: String(row.state ?? "proposed"),
  approvedForProd: Boolean(row.approved_for_prod),
  cadence: typeof row.cadence === "string" ? row.cadence : null,
  maxRps: asFiniteNumber(row.max_rps),
  maxConcurrency: asFiniteNumber(row.max_concurrency),
  timeoutSeconds: asFiniteNumber(row.timeout_seconds),
  includeUrlPatterns: asStringArray(row.include_url_patterns),
  excludeUrlPatterns: asStringArray(row.exclude_url_patterns),
  lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
  lastSuccessAt: typeof row.last_success_at === "string" ? row.last_success_at : null,
  rollingPromotionRate30d: asFiniteNumber(row.rolling_promotion_rate_30d),
  rollingFailureRate30d: asFiniteNumber(row.rolling_failure_rate_30d),
  metadataJson: asRecord(row.metadata_json),
})

const toSourceHealthRow = (row: Record<string, unknown>): SourceHealthRow => ({
  sourceKey: String(row.source_key ?? ""),
  displayName: String(row.display_name ?? ""),
  state: String(row.state ?? "proposed"),
  approvedForProd: Boolean(row.approved_for_prod),
  cadence: typeof row.cadence === "string" ? row.cadence : null,
  lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
  lastSuccessAt: typeof row.last_success_at === "string" ? row.last_success_at : null,
  rollingPromotionRate30d: asFiniteNumber(row.rolling_promotion_rate_30d),
  rollingFailureRate30d: asFiniteNumber(row.rolling_failure_rate_30d),
  metadataJson: asRecord(row.metadata_json),
})

export class DurableStoreRepository {
  constructor(
    private readonly client: GenericSupabaseClient,
    private readonly logger: Logger
  ) {}

  async createRun(sourceKey: string): Promise<IngestRun> {
    const { data, error } = await this.client
      .from("ingest_runs")
      .insert({ source_key: sourceKey, status: "running" })
      .select("id, source_key, status")
      .single()

    if (error) {
      throw new Error(`Failed to create ingest run: ${error.message}`)
    }

    return must(data as IngestRun | null, "Missing ingest run row after insert")
  }

  async finishRun(
    runId: string,
    status: RunStatus,
    meta: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.client
      .from("ingest_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        meta_json: meta,
      })
      .eq("id", runId)

    if (error) {
      throw new Error(`Failed to finish ingest run ${runId}: ${error.message}`)
    }
  }

  async getSourceRegistryRuntime(sourceKey: string): Promise<SourceRegistryRuntimeRecord | null> {
    const { data, error } = await this.client
      .from("ingest_source_registry")
      .select(
        "source_key, display_name, state, approved_for_prod, cadence, max_rps, max_concurrency, timeout_seconds, include_url_patterns, exclude_url_patterns, last_run_at, last_success_at, rolling_promotion_rate_30d, rolling_failure_rate_30d, metadata_json"
      )
      .eq("source_key", sourceKey)
      .maybeSingle()

    if (error) {
      throw new Error(
        `Failed to load source registry runtime config (${sourceKey}): ${error.message}`
      )
    }

    if (!data) {
      return null
    }

    return toSourceRegistryRuntimeRecord(data as Record<string, unknown>)
  }

  async updateSourceRegistryRuntime(
    sourceKey: string,
    patch: SourceRegistryRuntimePatch
  ): Promise<boolean> {
    const payload: Record<string, unknown> = {}

    if ("lastRunAt" in patch) {
      payload.last_run_at = patch.lastRunAt ?? null
    }
    if ("lastSuccessAt" in patch) {
      payload.last_success_at = patch.lastSuccessAt ?? null
    }
    if ("rollingPromotionRate30d" in patch) {
      payload.rolling_promotion_rate_30d = patch.rollingPromotionRate30d ?? null
    }
    if ("rollingFailureRate30d" in patch) {
      payload.rolling_failure_rate_30d = patch.rollingFailureRate30d ?? null
    }
    if ("metadataJson" in patch) {
      payload.metadata_json = patch.metadataJson ?? {}
    }

    if (Object.keys(payload).length === 0) {
      return false
    }

    const { data, error } = await this.client
      .from("ingest_source_registry")
      .update(payload)
      .eq("source_key", sourceKey)
      .select("source_key")
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to update source registry runtime (${sourceKey}): ${error.message}`)
    }

    return Boolean(data)
  }

  async listSourceHealthRows(sourceKeys?: string[]): Promise<SourceHealthRow[]> {
    const columns =
      "source_key, display_name, state, approved_for_prod, cadence, last_run_at, last_success_at, rolling_promotion_rate_30d, rolling_failure_rate_30d, metadata_json"

    const normalizedKeys = sourceKeys?.filter((key) => key.trim().length > 0) ?? []
    let query = this.client
      .from("ingest_source_registry")
      .select(columns)
      .order("source_key", { ascending: true })

    if (normalizedKeys.length > 0) {
      query = query.in("source_key", normalizedKeys)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to list source health rows: ${error.message}`)
    }

    return ((data ?? []) as Record<string, unknown>[]).map(toSourceHealthRow)
  }

  async insertDiscoveredPages(runId: string, sourceKey: string, urls: string[]): Promise<IngestPage[]> {
    if (urls.length === 0) return []

    const payload = urls.map((url) => ({
      run_id: runId,
      source_key: sourceKey,
      url,
      status: "discovered",
    }))

    const { data, error } = await this.client
      .from("ingest_pages")
      .insert(payload)
      .select("id, run_id, source_key, url, status")

    if (error) {
      throw new Error(`Failed to insert discovered pages: ${error.message}`)
    }

    return (data ?? []) as IngestPage[]
  }

  async markPageExtracted(pageId: string): Promise<void> {
    const { error } = await this.client
      .from("ingest_pages")
      .update({
        status: "extracted",
        fetched_at: new Date().toISOString(),
      })
      .eq("id", pageId)

    if (error) {
      throw new Error(`Failed to mark page extracted (${pageId}): ${error.message}`)
    }
  }

  async markPageFailed(pageId: string, errorText: string): Promise<void> {
    const { error } = await this.client
      .from("ingest_pages")
      .update({
        status: "failed",
        fetched_at: new Date().toISOString(),
        error_text: errorText.slice(0, 2000),
      })
      .eq("id", pageId)

    if (error) {
      throw new Error(`Failed to mark page failed (${pageId}): ${error.message}`)
    }
  }

  async upsertCandidates(
    runId: string,
    pageId: string | null,
    candidates: ExtractedCandidate[]
  ): Promise<StoredCandidate[]> {
    if (candidates.length === 0) return []

    const traitByKey = new Map<string, TraitHint[]>()
    const existingKeys = candidates.map((candidate) =>
      buildCandidateKey({
        sourceKey: candidate.sourceKey,
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
        description: candidate.description,
      })
    )
    const existingRowByKey = new Map<string, { id: string }>()

    const { data: existingRows, error: existingError } = await this.client
      .from("ingest_candidates")
      .select("id, candidate_key")
      .in("candidate_key", existingKeys)

    if (existingError) {
      throw new Error(`Failed to check existing candidate keys: ${existingError.message}`)
    }

    for (const row of (existingRows ?? []) as Array<{ id: string; candidate_key: string }>) {
      existingRowByKey.set(row.candidate_key, { id: row.id })
    }

    const payload = candidates.map((candidate) => {
      const candidateKey = buildCandidateKey({
        sourceKey: candidate.sourceKey,
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
        description: candidate.description,
      })
      const quality = evaluateCandidateQuality(candidate, DEFAULT_QUALITY_THRESHOLD)
      const duplicateSignal = existingRowByKey.has(candidateKey)
      const qualityFlags = duplicateSignal
        ? [...quality.flags, "duplicate_candidate_key_existing"]
        : quality.flags
      const qualityPassed = quality.passed && !duplicateSignal

      traitByKey.set(candidateKey, candidate.traits ?? [])

      return {
        run_id: runId,
        page_id: pageId,
        source_key: candidate.sourceKey,
        source_url: candidate.sourceUrl,
        title: candidate.title.trim(),
        description: normalizeOptionalText(candidate.description),
        reason_snippet: normalizeOptionalText(candidate.reasonSnippet),
        raw_excerpt: normalizeOptionalText(candidate.rawExcerpt),
        candidate_key: candidateKey,
        status: qualityPassed ? "curated" : "normalized",
        meta_json: {
          ...(candidate.meta ?? {}),
          quality: {
            version: QUALITY_RULE_VERSION,
            score: quality.score,
            threshold: quality.threshold,
            passed: qualityPassed,
            flags: qualityFlags,
            filtered_from_default_inbox: !qualityPassed,
          },
          duplicate_candidate_key_existing: duplicateSignal,
        },
      }
    })

    const { error: upsertError } = await this.client
      .from("ingest_candidates")
      .upsert(payload, { onConflict: "candidate_key", ignoreDuplicates: true })

    if (upsertError) {
      throw new Error(`Failed to upsert candidates: ${upsertError.message}`)
    }

    const keys = payload.map((item) => item.candidate_key)
    const { data, error } = await this.client
      .from("ingest_candidates")
      .select(
        "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json"
      )
      .in("candidate_key", keys)

    if (error) {
      throw new Error(`Failed to fetch candidate rows: ${error.message}`)
    }

    const rows: StoredCandidate[] = ((data ?? []) as Omit<StoredCandidate, "traits">[]).map(
      (row) => ({
        ...row,
        traits: [] as TraitHint[],
      })
    )

    for (const row of rows) {
      const traits = traitByKey.get(row.candidate_key) ?? []
      await this.upsertCandidateTraits(row.id, traits)
      row.traits = traits
    }

    return rows
  }

  async upsertCandidateTraits(candidateId: string, traits: TraitHint[]): Promise<void> {
    if (traits.length === 0) return

    const payload = traits.map((trait) => ({
      candidate_id: candidateId,
      trait_type_slug: trait.traitTypeSlug,
      trait_option_slug: trait.traitOptionSlug,
      confidence: trait.confidence ?? null,
      source: trait.source ?? "pipeline",
    }))

    const { error } = await this.client
      .from("ingest_candidate_traits")
      .upsert(payload, {
        onConflict: "candidate_id,trait_type_slug,trait_option_slug",
      })

    if (error) {
      throw new Error(`Failed to upsert candidate traits: ${error.message}`)
    }
  }

  async listCandidatesForDraftSync(limit = 100): Promise<StoredCandidate[]> {
    const { data, error } = await this.client
      .from("ingest_candidates")
      .select(
        "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json"
      )
      .in("status", ["normalized", "curated", "pushed_to_studio"])
      .order("updated_at", { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to list candidates for draft sync: ${error.message}`)
    }

    const rows = (data ?? []) as Omit<StoredCandidate, "traits">[]
    if (rows.length === 0) return []

    const ids = rows.map((row) => row.id)
    const { data: traitRows, error: traitError } = await this.client
      .from("ingest_candidate_traits")
      .select("candidate_id, trait_type_slug, trait_option_slug, confidence, source")
      .in("candidate_id", ids)

    if (traitError) {
      throw new Error(`Failed to list candidate traits: ${traitError.message}`)
    }

    const traitMap = new Map<string, TraitHint[]>()
    for (const row of (traitRows ?? []) as Array<{
      candidate_id: string
      trait_type_slug: string
      trait_option_slug: string
      confidence: number | null
      source: string
    }>) {
      const current = traitMap.get(row.candidate_id) ?? []
      current.push({
        traitTypeSlug: row.trait_type_slug,
        traitOptionSlug: row.trait_option_slug,
        confidence: row.confidence ?? undefined,
        source: row.source,
      })
      traitMap.set(row.candidate_id, current)
    }

    return rows.map((row) => ({
      ...row,
      traits: traitMap.get(row.id) ?? [],
    }))
  }

  async listCandidatesByRun(runId: string): Promise<StoredCandidate[]> {
    const { data, error } = await this.client
      .from("ingest_candidates")
      .select(
        "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json"
      )
      .eq("run_id", runId)
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(`Failed to list run candidates: ${error.message}`)
    }

    return ((data ?? []) as Omit<StoredCandidate, "traits">[]).map((row) => ({
      ...row,
      traits: [],
    }))
  }

  async writeSyncLog(params: {
    candidateId: string
    targetSystem: string
    targetId?: string
    status: SyncStatus
    errorText?: string
  }): Promise<void> {
    const { error } = await this.client.from("ingest_sync_log").insert({
      candidate_id: params.candidateId,
      target_system: params.targetSystem,
      target_id: params.targetId ?? null,
      status: params.status,
      error_text: params.errorText ?? null,
    })

    if (error) {
      throw new Error(`Failed to write sync log: ${error.message}`)
    }
  }

  async updateCandidateStatus(candidateId: string, status: CandidateStatus): Promise<void> {
    const { error } = await this.client
      .from("ingest_candidates")
      .update({ status })
      .eq("id", candidateId)

    if (error) {
      throw new Error(`Failed to update candidate status (${candidateId}): ${error.message}`)
    }
  }

  logSummary(label: string, meta: Record<string, unknown>): void {
    this.logger.info(label, meta)
  }
}
