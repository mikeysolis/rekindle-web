import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/database/server";
import { createIngestionServiceRoleClient } from "@/lib/ingestion/client";

export const INGEST_CANDIDATE_STATUSES = [
  "new",
  "normalized",
  "curated",
  "pushed_to_studio",
  "exported",
  "rejected",
] as const;

export type IngestCandidateStatus = (typeof INGEST_CANDIDATE_STATUSES)[number];

export type IngestionConfidenceBand = "high" | "medium" | "low" | "unknown";
export type IngestionConfidenceFilter = "all" | IngestionConfidenceBand;
export type IngestionDuplicateRisk = "likely" | "low";
export type IngestionDuplicateRiskFilter = "all" | IngestionDuplicateRisk;

export type IngestionCandidate = {
  id: string;
  runId: string;
  pageId: string | null;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  description: string | null;
  reasonSnippet: string | null;
  rawExcerpt: string | null;
  candidateKey: string;
  status: IngestCandidateStatus;
  metaJson: Record<string, unknown>;
  qualityScore: number | null;
  qualityThreshold: number | null;
  qualityPassed: boolean | null;
  qualityFlags: string[];
  confidenceBand: IngestionConfidenceBand;
  duplicateRisk: IngestionDuplicateRisk;
  createdAt: string | null;
  updatedAt: string | null;
};

export type IngestionCandidateTrait = {
  id: string;
  candidateId: string;
  traitTypeSlug: string;
  traitOptionSlug: string;
  confidence: number | null;
  source: string | null;
  createdAt: string | null;
};

export type IngestionSyncLogEntry = {
  id: string;
  candidateId: string;
  targetSystem: string;
  targetId: string | null;
  status: "pending" | "success" | "failed";
  syncedAt: string | null;
  errorText: string | null;
};

export type IngestionCandidateDetail = {
  candidate: IngestionCandidate;
  traits: IngestionCandidateTrait[];
  syncLog: IngestionSyncLogEntry[];
  duplicateHints: IngestionDuplicateHint[];
};

export type IngestionDuplicateHint = {
  candidateId: string;
  promotedDraftId: string | null;
  sourceUrl: string;
  title: string;
  status: IngestCandidateStatus;
  similarityScore: number;
  reasons: string[];
  updatedAt: string | null;
};

export type IngestionListFilters = {
  status?: IngestCandidateStatus | "all";
  sourceKey?: string;
  query?: string;
  confidence?: IngestionConfidenceFilter;
  duplicateRisk?: IngestionDuplicateRiskFilter;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export type PromoteIngestionCandidateResult = {
  draftId: string;
  created: boolean;
  warnings: string[];
};

type RawCandidateRow = {
  id: string;
  run_id: string;
  page_id: string | null;
  source_key: string;
  source_url: string;
  title: string;
  description: string | null;
  reason_snippet: string | null;
  raw_excerpt: string | null;
  candidate_key: string;
  status: string | null;
  meta_json: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type RawTraitRow = {
  id: string;
  candidate_id: string;
  trait_type_slug: string;
  trait_option_slug: string;
  confidence: number | null;
  source: string | null;
  created_at: string | null;
};

type RawSyncLogRow = {
  id: string;
  candidate_id: string;
  target_system: string;
  target_id: string | null;
  status: "pending" | "success" | "failed";
  synced_at: string | null;
  error_text: string | null;
};

type RawDuplicateHintRow = {
  id: string;
  source_url: string;
  title: string;
  candidate_key: string;
  status: string | null;
  updated_at: string | null;
};

type RawDuplicateSyncRow = {
  candidate_id: string;
  target_id: string | null;
  synced_at: string | null;
};

function parseCandidateStatus(value: string | null): IngestCandidateStatus {
  if (!value) {
    return "new";
  }

  if (
    value === "new" ||
    value === "normalized" ||
    value === "curated" ||
    value === "pushed_to_studio" ||
    value === "exported" ||
    value === "rejected"
  ) {
    return value;
  }

  return "new";
}

function toMetaJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function readQualityMeta(metaJson: Record<string, unknown>): {
  score: number | null;
  threshold: number | null;
  passed: boolean | null;
  flags: string[];
} {
  const value = metaJson.quality;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      score: null,
      threshold: null,
      passed: null,
      flags: [],
    };
  }

  const quality = value as Record<string, unknown>;
  const score = typeof quality.score === "number" ? quality.score : null;
  const threshold = typeof quality.threshold === "number" ? quality.threshold : null;
  const passed = typeof quality.passed === "boolean" ? quality.passed : null;
  const flags = Array.isArray(quality.flags)
    ? quality.flags.map((entry) => String(entry))
    : [];

  return {
    score,
    threshold,
    passed,
    flags,
  };
}

function classifyConfidenceBand(score: number | null): IngestionConfidenceBand {
  if (score === null) {
    return "unknown";
  }

  if (score >= 0.85) {
    return "high";
  }

  if (score >= 0.6) {
    return "medium";
  }

  return "low";
}

function classifyDuplicateRisk(
  metaJson: Record<string, unknown>,
  qualityFlags: string[],
): IngestionDuplicateRisk {
  const duplicateSignalInMeta = metaJson.duplicate_candidate_key_existing === true;
  const duplicateSignalInFlags = qualityFlags.includes("duplicate_candidate_key_existing");
  if (duplicateSignalInMeta || duplicateSignalInFlags) {
    return "likely";
  }

  return "low";
}

function isDateFilterValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcDateRange(date: string, edge: "start" | "end"): string {
  return edge === "start" ? `${date}T00:00:00.000Z` : `${date}T23:59:59.999Z`;
}

function mapCandidate(row: RawCandidateRow): IngestionCandidate {
  const metaJson = toMetaJson(row.meta_json);
  const quality = readQualityMeta(metaJson);

  return {
    id: row.id,
    runId: row.run_id,
    pageId: row.page_id,
    sourceKey: row.source_key,
    sourceUrl: row.source_url,
    title: row.title,
    description: row.description,
    reasonSnippet: row.reason_snippet,
    rawExcerpt: row.raw_excerpt,
    candidateKey: row.candidate_key,
    status: parseCandidateStatus(row.status),
    metaJson,
    qualityScore: quality.score,
    qualityThreshold: quality.threshold,
    qualityPassed: quality.passed,
    qualityFlags: quality.flags,
    confidenceBand: classifyConfidenceBand(quality.score),
    duplicateRisk: classifyDuplicateRisk(metaJson, quality.flags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrait(row: RawTraitRow): IngestionCandidateTrait {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    traitTypeSlug: row.trait_type_slug,
    traitOptionSlug: row.trait_option_slug,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapSyncLog(row: RawSyncLogRow): IngestionSyncLogEntry {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    targetSystem: row.target_system,
    targetId: row.target_id,
    status: row.status,
    syncedAt: row.synced_at,
    errorText: row.error_text,
  };
}

function normalizeForSimilarity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenizeForSimilarity(value: string): string[] {
  return normalizeForSimilarity(value).split(" ").filter(Boolean);
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersectionCount = 0;

  for (const value of leftSet) {
    if (rightSet.has(value)) {
      intersectionCount += 1;
    }
  }

  const unionCount = new Set([...leftSet, ...rightSet]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function normalizeComparableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname =
      parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
        ? parsed.pathname.slice(0, -1)
        : parsed.pathname;
    return parsed.toString();
  } catch {
    return url;
  }
}

function computeDuplicateHints(params: {
  candidate: IngestionCandidate;
  rows: RawDuplicateHintRow[];
}): IngestionDuplicateHint[] {
  const sourceUrl = normalizeComparableUrl(params.candidate.sourceUrl);
  const candidateKey = params.candidate.candidateKey;
  const baseTitleTokens = tokenizeForSimilarity(params.candidate.title);

  const scored = params.rows
    .map((row) => {
      const reasons: string[] = [];
      let score = 0;

      if (row.candidate_key === candidateKey) {
        reasons.push("same_candidate_key");
        score = Math.max(score, 1);
      }

      if (normalizeComparableUrl(row.source_url) === sourceUrl) {
        reasons.push("same_source_url");
        score = Math.max(score, 0.98);
      }

      const titleSimilarity = jaccardSimilarity(baseTitleTokens, tokenizeForSimilarity(row.title));
      if (titleSimilarity >= 0.7) {
        reasons.push("high_title_similarity");
        score = Math.max(score, titleSimilarity);
      }

      if (reasons.length === 0 && titleSimilarity < 0.66) {
        return null;
      }

      return {
        candidateId: row.id,
        promotedDraftId: null,
        sourceUrl: row.source_url,
        title: row.title,
        status: parseCandidateStatus(row.status),
        similarityScore: Number(score.toFixed(4)),
        reasons,
        updatedAt: row.updated_at,
      } satisfies IngestionDuplicateHint;
    })
    .filter((value): value is IngestionDuplicateHint => Boolean(value));

  return scored.sort((left, right) => right.similarityScore - left.similarityScore).slice(0, 5);
}

export async function listIngestionSourceKeys(): Promise<string[]> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_candidates")
    .select("source_key")
    .order("source_key", { ascending: true });

  if (error) {
    throw new Error(`Failed to list ingestion source keys: ${error.message}`);
  }

  return Array.from(
    new Set((data ?? []).map((row) => String(row.source_key ?? "")).filter(Boolean)),
  );
}

export async function listIngestionCandidates(
  filters: IngestionListFilters = {},
): Promise<IngestionCandidate[]> {
  const ingest = createIngestionServiceRoleClient();
  const status = filters.status ?? "all";
  const sourceKey = (filters.sourceKey ?? "").trim();
  const query = (filters.query ?? "").trim();
  const confidence = filters.confidence ?? "all";
  const duplicateRisk = filters.duplicateRisk ?? "all";
  const dateFrom = (filters.dateFrom ?? "").trim();
  const dateTo = (filters.dateTo ?? "").trim();
  const limit = filters.limit ?? 100;
  const dbLimit = Math.min(Math.max(limit * 5, 200), 1000);

  let request = ingest
    .from("ingest_candidates")
    .select(
      "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(dbLimit);

  if (status !== "all") {
    request = request.eq("status", status);
  }

  if (sourceKey) {
    request = request.eq("source_key", sourceKey);
  }

  if (query) {
    const pattern = `%${query}%`;
    request = request.or(
      `title.ilike.${pattern},description.ilike.${pattern},source_url.ilike.${pattern}`,
    );
  }

  if (isDateFilterValue(dateFrom)) {
    request = request.gte("updated_at", toUtcDateRange(dateFrom, "start"));
  }

  if (isDateFilterValue(dateTo)) {
    request = request.lte("updated_at", toUtcDateRange(dateTo, "end"));
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to list ingestion candidates: ${error.message}`);
  }

  const mapped = (data ?? []).map((row) => mapCandidate(row as RawCandidateRow));
  const filtered = mapped.filter((candidate) => {
    if (confidence !== "all" && candidate.confidenceBand !== confidence) {
      return false;
    }

    if (duplicateRisk !== "all" && candidate.duplicateRisk !== duplicateRisk) {
      return false;
    }

    return true;
  });

  return filtered.slice(0, limit);
}

export async function getIngestionCandidateDetail(
  candidateId: string,
): Promise<IngestionCandidateDetail | null> {
  const ingest = createIngestionServiceRoleClient();

  const { data: candidateRow, error: candidateError } = await ingest
    .from("ingest_candidates")
    .select(
      "id, run_id, page_id, source_key, source_url, title, description, reason_snippet, raw_excerpt, candidate_key, status, meta_json, created_at, updated_at",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Failed to load ingestion candidate: ${candidateError.message}`);
  }

  if (!candidateRow) {
    return null;
  }

  const [{ data: traitRows, error: traitError }, { data: syncRows, error: syncError }] =
    await Promise.all([
      ingest
        .from("ingest_candidate_traits")
        .select(
          "id, candidate_id, trait_type_slug, trait_option_slug, confidence, source, created_at",
        )
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: true }),
      ingest
        .from("ingest_sync_log")
        .select("id, candidate_id, target_system, target_id, status, synced_at, error_text")
        .eq("candidate_id", candidateId)
        .order("synced_at", { ascending: false }),
    ]);

  if (traitError) {
    throw new Error(`Failed to load ingestion candidate traits: ${traitError.message}`);
  }

  if (syncError) {
    throw new Error(`Failed to load ingestion sync log: ${syncError.message}`);
  }

  const { data: duplicateRows, error: duplicateError } = await ingest
    .from("ingest_candidates")
    .select("id, source_url, title, candidate_key, status, updated_at")
    .eq("source_key", candidateRow.source_key)
    .neq("id", candidateId)
    .in("status", ["normalized", "curated", "pushed_to_studio"])
    .order("updated_at", { ascending: false })
    .limit(250);

  if (duplicateError) {
    throw new Error(`Failed to load duplicate hints: ${duplicateError.message}`);
  }

  const mappedCandidate = mapCandidate(candidateRow as RawCandidateRow);
  const duplicateHints = computeDuplicateHints({
    candidate: mappedCandidate,
    rows: (duplicateRows ?? []) as RawDuplicateHintRow[],
  });
  const duplicateCandidateIds = duplicateHints.map((hint) => hint.candidateId);
  const draftIdByCandidateId = new Map<string, string>();

  if (duplicateCandidateIds.length > 0) {
    const { data: duplicateSyncRows, error: duplicateSyncError } = await ingest
      .from("ingest_sync_log")
      .select("candidate_id, target_id, synced_at")
      .eq("target_system", "app_draft")
      .eq("status", "success")
      .in("candidate_id", duplicateCandidateIds)
      .not("target_id", "is", null)
      .order("synced_at", { ascending: false });

    if (duplicateSyncError) {
      throw new Error(
        `Failed to load duplicate hint draft links: ${duplicateSyncError.message}`,
      );
    }

    for (const row of (duplicateSyncRows ?? []) as RawDuplicateSyncRow[]) {
      if (!row.target_id || draftIdByCandidateId.has(row.candidate_id)) {
        continue;
      }
      draftIdByCandidateId.set(row.candidate_id, row.target_id);
    }
  }

  return {
    candidate: mappedCandidate,
    traits: (traitRows ?? []).map((row) => mapTrait(row as RawTraitRow)),
    syncLog: (syncRows ?? []).map((row) => mapSyncLog(row as RawSyncLogRow)),
    duplicateHints: duplicateHints.map((hint) => ({
      ...hint,
      promotedDraftId: draftIdByCandidateId.get(hint.candidateId) ?? null,
    })),
  };
}

function appendStudioReviewMetadata(params: {
  existingMeta: Record<string, unknown>;
  action: "reject" | "needs_work";
  note: string | null;
  actorUserId: string;
}): Record<string, unknown> {
  return {
    ...params.existingMeta,
    studio_review: {
      last_action: params.action,
      last_note: params.note,
      last_actor_user_id: params.actorUserId,
      last_action_at: new Date().toISOString(),
    },
  };
}

async function setCandidateStatusWithNote(params: {
  candidateId: string;
  status: IngestCandidateStatus;
  action: "reject" | "needs_work";
  note: string | null;
  actorUserId: string;
}): Promise<void> {
  const ingest = createIngestionServiceRoleClient();

  const { data, error } = await ingest
    .from("ingest_candidates")
    .select("meta_json")
    .eq("id", params.candidateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load candidate metadata: ${error.message}`);
  }

  if (!data) {
    throw new Error("Candidate not found.");
  }

  const nextMeta = appendStudioReviewMetadata({
    existingMeta: toMetaJson(data.meta_json),
    action: params.action,
    note: params.note,
    actorUserId: params.actorUserId,
  });

  const { error: updateError } = await ingest
    .from("ingest_candidates")
    .update({
      status: params.status,
      meta_json: nextMeta,
    })
    .eq("id", params.candidateId);

  if (updateError) {
    throw new Error(`Failed to update candidate status: ${updateError.message}`);
  }
}

export async function rejectIngestionCandidate(params: {
  candidateId: string;
  actorUserId: string;
  note: string | null;
}): Promise<void> {
  await setCandidateStatusWithNote({
    candidateId: params.candidateId,
    status: "rejected",
    action: "reject",
    note: params.note,
    actorUserId: params.actorUserId,
  });
}

export async function markIngestionCandidateNeedsWork(params: {
  candidateId: string;
  actorUserId: string;
  note: string | null;
}): Promise<void> {
  await setCandidateStatusWithNote({
    candidateId: params.candidateId,
    status: "curated",
    action: "needs_work",
    note: params.note,
    actorUserId: params.actorUserId,
  });
}

async function createPendingSyncLog(params: {
  candidateId: string;
  targetSystem: string;
}): Promise<string> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_sync_log")
    .insert({
      candidate_id: params.candidateId,
      target_system: params.targetSystem,
      target_id: null,
      status: "pending",
      error_text: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create pending ingestion sync log: ${error.message}`);
  }

  return String(data.id);
}

async function finalizeSyncLog(params: {
  syncLogId: string;
  status: "success" | "failed";
  targetId?: string | null;
  errorText?: string | null;
}): Promise<void> {
  const ingest = createIngestionServiceRoleClient();
  const { error } = await ingest
    .from("ingest_sync_log")
    .update({
      status: params.status,
      target_id: params.targetId ?? null,
      error_text: params.errorText ?? null,
      synced_at: new Date().toISOString(),
    })
    .eq("id", params.syncLogId);

  if (error) {
    throw new Error(`Failed to finalize ingestion sync log: ${error.message}`);
  }
}

async function updateCandidateStatus(
  candidateId: string,
  status: IngestCandidateStatus,
): Promise<void> {
  const ingest = createIngestionServiceRoleClient();
  const { error } = await ingest
    .from("ingest_candidates")
    .update({ status })
    .eq("id", candidateId);

  if (error) {
    throw new Error(`Failed to update ingestion candidate status: ${error.message}`);
  }
}

function dedupeCandidateTraits(traits: IngestionCandidateTrait[]): IngestionCandidateTrait[] {
  const output: IngestionCandidateTrait[] = [];
  const seen = new Set<string>();

  for (const trait of traits) {
    const key = `${trait.traitTypeSlug}|${trait.traitOptionSlug}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(trait);
  }

  return output;
}

async function syncDraftTraitsFromCandidateTraits(params: {
  appSupabase: SupabaseClient;
  draftId: string;
  traits: IngestionCandidateTrait[];
}): Promise<string[]> {
  const warnings: string[] = [];
  const traits = dedupeCandidateTraits(params.traits);

  const { appSupabase, draftId } = params;
  const { error: deleteError } = await appSupabase
    .from("idea_draft_traits")
    .delete()
    .eq("draft_id", draftId);

  if (deleteError) {
    throw new Error(`Failed to clear draft traits: ${deleteError.message}`);
  }

  if (traits.length === 0) {
    return warnings;
  }

  const typeSlugs = Array.from(new Set(traits.map((trait) => trait.traitTypeSlug)));

  const { data: typeRows, error: typeError } = await appSupabase
    .from("trait_types")
    .select("id, slug")
    .in("slug", typeSlugs);

  if (typeError) {
    throw new Error(`Failed to resolve trait types: ${typeError.message}`);
  }

  const traitTypeIdBySlug = new Map(
    (typeRows ?? []).map((row) => [String(row.slug), String(row.id)]),
  );
  const traitTypeIds = Array.from(traitTypeIdBySlug.values());

  if (traitTypeIds.length === 0) {
    warnings.push("No candidate traits matched trait_types in app DB.");
    return warnings;
  }

  const [{ data: bindingRows, error: bindingError }, { data: optionRows, error: optionError }] =
    await Promise.all([
      appSupabase
        .from("trait_bindings")
        .select("trait_type_id, select_mode")
        .eq("context", "idea")
        .in("trait_type_id", traitTypeIds),
      appSupabase
        .from("trait_options")
        .select("id, trait_type_id, slug")
        .in("trait_type_id", traitTypeIds),
    ]);

  if (bindingError) {
    throw new Error(`Failed to resolve trait bindings: ${bindingError.message}`);
  }

  if (optionError) {
    throw new Error(`Failed to resolve trait options: ${optionError.message}`);
  }

  const selectModeByTypeId = new Map(
    (bindingRows ?? []).map((row) => [String(row.trait_type_id), String(row.select_mode)]),
  );
  const optionByTypeAndSlug = new Map(
    (optionRows ?? []).map((row) => [
      `${String(row.trait_type_id)}|${String(row.slug)}`,
      String(row.id),
    ]),
  );

  const insertRows: Array<{
    draft_id: string;
    trait_type_id: string;
    trait_option_id: string;
    select_mode: "single" | "multi";
  }> = [];

  for (const trait of traits) {
    const traitTypeId = traitTypeIdBySlug.get(trait.traitTypeSlug);
    if (!traitTypeId) {
      warnings.push(`Skipped unknown trait type slug: ${trait.traitTypeSlug}`);
      continue;
    }

    const selectMode = selectModeByTypeId.get(traitTypeId);
    if (!selectMode || (selectMode !== "single" && selectMode !== "multi")) {
      warnings.push(`Skipped trait without idea binding: ${trait.traitTypeSlug}`);
      continue;
    }

    const traitOptionId = optionByTypeAndSlug.get(
      `${traitTypeId}|${trait.traitOptionSlug}`,
    );
    if (!traitOptionId) {
      warnings.push(
        `Skipped unknown trait option slug for ${trait.traitTypeSlug}: ${trait.traitOptionSlug}`,
      );
      continue;
    }

    insertRows.push({
      draft_id: draftId,
      trait_type_id: traitTypeId,
      trait_option_id: traitOptionId,
      select_mode: selectMode,
    });
  }

  if (insertRows.length === 0) {
    return warnings;
  }

  const { error: insertError } = await appSupabase
    .from("idea_draft_traits")
    .insert(insertRows);

  if (insertError) {
    throw new Error(`Failed to save draft traits: ${insertError.message}`);
  }

  return warnings;
}

async function getExistingDraftForCandidate(
  appSupabase: SupabaseClient,
  candidateId: string,
): Promise<string | null> {
  const { data, error } = await appSupabase
    .from("idea_drafts")
    .select("id")
    .eq("ingest_candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing promoted draft: ${error.message}`);
  }

  return data?.id ? String(data.id) : null;
}

async function getCandidateTraits(candidateId: string): Promise<IngestionCandidateTrait[]> {
  const ingest = createIngestionServiceRoleClient();
  const { data, error } = await ingest
    .from("ingest_candidate_traits")
    .select(
      "id, candidate_id, trait_type_slug, trait_option_slug, confidence, source, created_at",
    )
    .eq("candidate_id", candidateId);

  if (error) {
    throw new Error(`Failed to load candidate traits: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTrait(row as RawTraitRow));
}

export async function promoteIngestionCandidateToDraft(params: {
  candidateId: string;
  actorUserId: string;
}): Promise<PromoteIngestionCandidateResult> {
  const warnings: string[] = [];
  const appSupabase = await createSupabaseServerClient();
  const ingest = createIngestionServiceRoleClient();

  const { data: candidateRow, error: candidateError } = await ingest
    .from("ingest_candidates")
    .select(
      "id, source_url, title, description, reason_snippet, status, meta_json, created_at, updated_at, run_id, page_id, source_key, raw_excerpt, candidate_key",
    )
    .eq("id", params.candidateId)
    .maybeSingle();

  if (candidateError) {
    throw new Error(`Failed to load candidate for promotion: ${candidateError.message}`);
  }

  if (!candidateRow) {
    throw new Error("Candidate not found.");
  }

  const candidate = mapCandidate(candidateRow as RawCandidateRow);
  if (candidate.status === "rejected" || candidate.status === "exported") {
    throw new Error(`Cannot promote candidate from status "${candidate.status}".`);
  }

  const pendingSyncLogId = await createPendingSyncLog({
    candidateId: params.candidateId,
    targetSystem: "app_draft",
  });

  let createdDraftId: string;
  let created = false;

  try {
    const existingDraftId = await getExistingDraftForCandidate(appSupabase, params.candidateId);
    if (existingDraftId) {
      createdDraftId = existingDraftId;
    } else {
      const { data: insertedDraft, error: insertError } = await appSupabase
        .from("idea_drafts")
        .insert({
          title: candidate.title,
          description: candidate.description,
          reason_snippet: candidate.reasonSnippet,
          source_url: candidate.sourceUrl,
          status: "draft",
          active: true,
          ingest_candidate_id: params.candidateId,
          created_by: params.actorUserId,
          updated_by: params.actorUserId,
        })
        .select("id")
        .single();

      if (insertError) {
        const code = (insertError as { code?: string }).code;
        if (code === "23505") {
          const concurrentDraftId = await getExistingDraftForCandidate(
            appSupabase,
            params.candidateId,
          );
          if (concurrentDraftId) {
            createdDraftId = concurrentDraftId;
          } else {
            throw new Error(
              "Draft creation hit unique conflict but existing draft could not be resolved.",
            );
          }
        } else {
          throw new Error(`Failed to create draft from candidate: ${insertError.message}`);
        }
      } else {
        createdDraftId = String(insertedDraft.id);
        created = true;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await finalizeSyncLog({
        syncLogId: pendingSyncLogId,
        status: "failed",
        errorText: message.slice(0, 2000),
      });
    } catch (syncError) {
      const syncMessage = syncError instanceof Error ? syncError.message : String(syncError);
      throw new Error(`${message} (also failed to record sync failure: ${syncMessage})`);
    }
    throw new Error(message);
  }

  try {
    const traits = await getCandidateTraits(params.candidateId);
    const traitWarnings = await syncDraftTraitsFromCandidateTraits({
      appSupabase,
      draftId: createdDraftId,
      traits,
    });
    warnings.push(...traitWarnings);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await updateCandidateStatus(params.candidateId, "pushed_to_studio");
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  try {
    await finalizeSyncLog({
      syncLogId: pendingSyncLogId,
      status: "success",
      targetId: createdDraftId,
      errorText: null,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  return {
    draftId: createdDraftId,
    created,
    warnings,
  };
}
