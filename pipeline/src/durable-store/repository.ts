import type { GenericSupabaseClient } from "../clients/supabase.js"
import { buildCandidateKey } from "../core/hashing.js"
import { normalizeOptionalText } from "../core/normalize.js"
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

type SyncStatus = "pending" | "success" | "failed"

const must = <T>(value: T | null, context: string): T => {
  if (value === null) {
    throw new Error(context)
  }
  return value
}

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
    const payload = candidates.map((candidate) => {
      const candidateKey = buildCandidateKey({
        sourceKey: candidate.sourceKey,
        sourceUrl: candidate.sourceUrl,
        title: candidate.title,
        description: candidate.description,
      })
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
        status: "normalized",
        meta_json: candidate.meta ?? {},
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
