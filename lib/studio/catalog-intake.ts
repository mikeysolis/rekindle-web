import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/database/server";
import type { Database, Json } from "@/lib/database/types.gen";

type AppSupabaseClient = SupabaseClient<Database>;

type BatchViewRow = Database["public"]["Views"]["v_catalog_import_batches"]["Row"];
type BatchClusterViewRow =
  Database["public"]["Views"]["v_catalog_import_batch_clusters"]["Row"];
type ClusterCandidateViewRow =
  Database["public"]["Views"]["v_catalog_import_cluster_candidates"]["Row"];

export const CATALOG_IMPORT_REJECT_REASON_CODES = [
  "duplicate_existing_candidate",
  "duplicate_existing_draft",
  "duplicate_existing_idea",
  "too_similar_to_stronger_variant",
  "too_specific_or_one_time",
  "unclear_or_confusing",
  "awkward_generated_wording",
  "low_value",
  "off_method",
] as const;

export type CatalogImportRejectReasonCode =
  (typeof CATALOG_IMPORT_REJECT_REASON_CODES)[number];

export const CATALOG_IMPORT_REJECT_REASON_OPTIONS: Array<{
  code: CatalogImportRejectReasonCode;
  label: string;
  description: string;
}> = [
  {
    code: "duplicate_existing_candidate",
    label: "Duplicate candidate",
    description: "Duplicates another generated candidate already in catalog intake.",
  },
  {
    code: "duplicate_existing_draft",
    label: "Duplicate draft",
    description: "Duplicates an existing Studio draft.",
  },
  {
    code: "duplicate_existing_idea",
    label: "Duplicate published idea",
    description: "Duplicates an already published idea.",
  },
  {
    code: "too_similar_to_stronger_variant",
    label: "Weaker variant",
    description: "Too similar to a stronger candidate already in the cluster.",
  },
  {
    code: "too_specific_or_one_time",
    label: "Too specific",
    description: "Too narrow, one-time, or not reusable enough for the catalog.",
  },
  {
    code: "unclear_or_confusing",
    label: "Unclear wording",
    description: "Too hard to understand or too ambiguous as written.",
  },
  {
    code: "awkward_generated_wording",
    label: "Awkward wording",
    description: "Generated wording is awkward enough to reject rather than rewrite.",
  },
  {
    code: "low_value",
    label: "Low value",
    description: "Concept is too weak to keep in the editorial queue.",
  },
  {
    code: "off_method",
    label: "Off method",
    description: "Does not fit the intended Rekindle catalog method or editorial frame.",
  },
];

export const CATALOG_IMPORT_EDITOR_STATES = [
  "pending",
  "preferred",
  "alternate",
  "needs_rewrite",
  "rejected",
  "promoted",
] as const;

export type CatalogImportEditorState =
  (typeof CATALOG_IMPORT_EDITOR_STATES)[number];

export const CATALOG_IMPORT_CLUSTER_REVIEW_STATUSES = [
  "pending",
  "reviewing",
  "ready_for_draft",
  "promoted",
  "discarded",
] as const;

export type CatalogImportClusterReviewStatus =
  (typeof CATALOG_IMPORT_CLUSTER_REVIEW_STATUSES)[number];

export type CatalogImportBatch = {
  batchId: string;
  family: string;
  batchCode: string;
  version: string | null;
  segment: string | null;
  sourcePath: string;
  sourcePoolPath: string | null;
  rowCount: number;
  importStatus: string;
  candidateCount: number;
  clusterCount: number;
  pendingCount: number;
  readyForDraftCount: number;
  promotedCount: number;
  rejectedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogImportBatchDetail = CatalogImportBatch & {
  unclusteredCount: number;
};

export type CatalogImportBatchCluster = {
  batchId: string;
  clusterId: string;
  family: string;
  eventAnchor: string | null;
  anchorFamily: string | null;
  conceptKey: string | null;
  canonicalTitle: string | null;
  reviewStatus: CatalogImportClusterReviewStatus;
  preferredCandidateId: string | null;
  preferredTitle: string | null;
  batchCandidateCount: number;
  totalCandidateCount: number;
  promotedDraftId: string | null;
  updatedAt: string | null;
};

export type CatalogImportClusterCandidate = {
  candidateId: string;
  clusterId: string | null;
  batchId: string;
  batchCode: string;
  family: string;
  title: string;
  editorState: CatalogImportEditorState;
  preferredInCluster: boolean;
  machineDuplicateState: string;
  machineScore: number | null;
  duplicateOfCandidateId: string | null;
  duplicateOfIdeaId: string | null;
  linkedDraftId: string | null;
  sourceRowNumber: number;
  specificityLevel: string | null;
  eventAnchor: string | null;
  anchorFamily: string | null;
  editorNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CatalogImportClusterDetail = {
  clusterId: string;
  family: string;
  eventAnchor: string | null;
  anchorFamily: string | null;
  conceptKey: string | null;
  canonicalTitle: string | null;
  reviewStatus: CatalogImportClusterReviewStatus;
  preferredCandidateId: string | null;
  preferredTitle: string | null;
  editorialNote: string | null;
  createdAt: string;
  updatedAt: string;
  promotedDraftId: string | null;
  candidates: CatalogImportClusterCandidate[];
};

export type CatalogImportClusterBatchLink = {
  batchId: string;
  batchCode: string;
};

export type SetCatalogImportPreferredCandidateInput = {
  clusterId: string;
  candidateId: string;
  actorUserId: string;
  note?: string | null;
};

export type SetCatalogImportPreferredCandidateResult = {
  clusterId: string;
  preferredCandidateId: string;
  canonicalTitle: string;
};

export type SetCatalogImportCandidateAlternateInput = {
  candidateId: string;
  actorUserId: string;
  note?: string | null;
};

export type MarkCatalogImportCandidateNeedsRewriteInput = {
  candidateId: string;
  actorUserId: string;
  note?: string | null;
};

export type RejectCatalogImportCandidateInput = {
  candidateId: string;
  actorUserId: string;
  reasonCode: string;
  note?: string | null;
};

export type CatalogImportCandidateStateMutationResult = {
  candidateId: string;
  editorState: CatalogImportEditorState;
};

export type PromoteCatalogImportCandidateToDraftInput = {
  candidateId: string;
  actorUserId: string;
};

export type PromoteCatalogImportCandidateToDraftResult = {
  draftId: string;
  created: boolean;
  warnings: string[];
};

function getAppSupabase(
  client?: AppSupabaseClient,
): Promise<AppSupabaseClient> | AppSupabaseClient {
  if (client) {
    return client;
  }

  return createSupabaseServerClient() as Promise<AppSupabaseClient>;
}

function requiredString(value: string | null | undefined, field: string): string {
  if (!value) {
    throw new Error(`Catalog intake contract error: missing ${field}.`);
  }

  return value;
}

function requiredNumber(value: number | null | undefined, field: string): number {
  if (typeof value !== "number") {
    throw new Error(`Catalog intake contract error: missing ${field}.`);
  }

  return value;
}

function parseClusterReviewStatus(value: string | null | undefined): CatalogImportClusterReviewStatus {
  if (value === "reviewing" || value === "ready_for_draft" || value === "promoted" || value === "discarded") {
    return value;
  }

  return "pending";
}

function parseEditorState(value: string | null | undefined): CatalogImportEditorState {
  if (
    value === "preferred" ||
    value === "alternate" ||
    value === "needs_rewrite" ||
    value === "rejected" ||
    value === "promoted"
  ) {
    return value;
  }

  return "pending";
}

function normalizeNote(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeRejectReasonCode(value: string): CatalogImportRejectReasonCode {
  if (
    CATALOG_IMPORT_REJECT_REASON_CODES.includes(
      value as CatalogImportRejectReasonCode,
    )
  ) {
    return value as CatalogImportRejectReasonCode;
  }

  throw new Error(`Invalid catalog intake reject reason code: ${value}`);
}

function normalizeWarnings(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (typeof entry === "string") {
      return entry;
    }

    return JSON.stringify(entry);
  });
}

function mapBatch(row: BatchViewRow): CatalogImportBatch {
  return {
    batchId: requiredString(row.batch_id, "batch_id"),
    family: requiredString(row.family, "family"),
    batchCode: requiredString(row.batch_code, "batch_code"),
    version: row.version ?? null,
    segment: row.segment ?? null,
    sourcePath: requiredString(row.source_path, "source_path"),
    sourcePoolPath: row.source_pool_path ?? null,
    rowCount: requiredNumber(row.row_count, "row_count"),
    importStatus: requiredString(row.import_status, "import_status"),
    candidateCount: requiredNumber(row.candidate_count, "candidate_count"),
    clusterCount: requiredNumber(row.cluster_count, "cluster_count"),
    pendingCount: requiredNumber(row.pending_count, "pending_count"),
    readyForDraftCount: requiredNumber(
      row.ready_for_draft_count,
      "ready_for_draft_count",
    ),
    promotedCount: requiredNumber(row.promoted_count, "promoted_count"),
    rejectedCount: requiredNumber(row.rejected_count, "rejected_count"),
    createdAt: requiredString(row.created_at, "created_at"),
    updatedAt: requiredString(row.updated_at, "updated_at"),
  };
}

function mapBatchCluster(row: BatchClusterViewRow): CatalogImportBatchCluster {
  return {
    batchId: requiredString(row.batch_id, "batch_id"),
    clusterId: requiredString(row.cluster_id, "cluster_id"),
    family: requiredString(row.family, "family"),
    eventAnchor: row.event_anchor ?? null,
    anchorFamily: row.anchor_family ?? null,
    conceptKey: row.concept_key ?? null,
    canonicalTitle: row.canonical_title ?? null,
    reviewStatus: parseClusterReviewStatus(row.review_status),
    preferredCandidateId: row.preferred_candidate_id ?? null,
    preferredTitle: row.preferred_title ?? null,
    batchCandidateCount: requiredNumber(
      row.batch_candidate_count,
      "batch_candidate_count",
    ),
    totalCandidateCount: requiredNumber(
      row.total_candidate_count,
      "total_candidate_count",
    ),
    promotedDraftId: row.promoted_draft_id ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapClusterCandidate(
  row: ClusterCandidateViewRow,
): CatalogImportClusterCandidate {
  return {
    candidateId: requiredString(row.candidate_id, "candidate_id"),
    clusterId: row.cluster_id ?? null,
    batchId: requiredString(row.batch_id, "batch_id"),
    batchCode: requiredString(row.batch_code, "batch_code"),
    family: requiredString(row.family, "family"),
    title: requiredString(row.title, "title"),
    editorState: parseEditorState(row.editor_state),
    preferredInCluster: Boolean(row.preferred_in_cluster),
    machineDuplicateState: requiredString(
      row.machine_duplicate_state,
      "machine_duplicate_state",
    ),
    machineScore: row.machine_score ?? null,
    duplicateOfCandidateId: row.duplicate_of_candidate_id ?? null,
    duplicateOfIdeaId: row.duplicate_of_idea_id ?? null,
    linkedDraftId: row.linked_draft_id ?? null,
    sourceRowNumber: requiredNumber(row.source_row_number, "source_row_number"),
    specificityLevel: row.specificity_level ?? null,
    eventAnchor: row.event_anchor ?? null,
    anchorFamily: row.anchor_family ?? null,
    editorNote: row.editor_note ?? null,
    createdAt: requiredString(row.created_at, "created_at"),
    updatedAt: requiredString(row.updated_at, "updated_at"),
  };
}

function sortClusterCandidates(
  candidates: CatalogImportClusterCandidate[],
  preferredCandidateId: string | null,
): CatalogImportClusterCandidate[] {
  return [...candidates].sort((left, right) => {
    const leftPreferred =
      left.candidateId === preferredCandidateId || left.preferredInCluster;
    const rightPreferred =
      right.candidateId === preferredCandidateId || right.preferredInCluster;

    if (leftPreferred !== rightPreferred) {
      return leftPreferred ? -1 : 1;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function listCatalogImportBatches(
  client?: AppSupabaseClient,
): Promise<CatalogImportBatch[]> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase
    .from("v_catalog_import_batches")
    .select(
      "batch_id, family, batch_code, version, segment, source_path, source_pool_path, row_count, import_status, candidate_count, cluster_count, pending_count, ready_for_draft_count, promoted_count, rejected_count, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list catalog import batches: ${error.message}`);
  }

  return (data ?? []).map((row) => mapBatch(row as BatchViewRow));
}

export async function getCatalogImportBatch(
  batchId: string,
  client?: AppSupabaseClient,
): Promise<CatalogImportBatchDetail | null> {
  const supabase = await getAppSupabase(client);
  const [{ data: batchRow, error: batchError }, { count, error: countError }] =
    await Promise.all([
      supabase
        .from("v_catalog_import_batches")
        .select(
          "batch_id, family, batch_code, version, segment, source_path, source_pool_path, row_count, import_status, candidate_count, cluster_count, pending_count, ready_for_draft_count, promoted_count, rejected_count, created_at, updated_at",
        )
        .eq("batch_id", batchId)
        .maybeSingle(),
      supabase
        .from("catalog_import_candidates")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId)
        .is("cluster_id", null),
    ]);

  if (batchError) {
    throw new Error(`Failed to load catalog import batch: ${batchError.message}`);
  }

  if (countError) {
    throw new Error(
      `Failed to count unclustered catalog import candidates: ${countError.message}`,
    );
  }

  if (!batchRow) {
    return null;
  }

  return {
    ...mapBatch(batchRow as BatchViewRow),
    unclusteredCount: count ?? 0,
  };
}

export async function listCatalogImportBatchClusters(
  batchId: string,
  client?: AppSupabaseClient,
): Promise<CatalogImportBatchCluster[]> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase
    .from("v_catalog_import_batch_clusters")
    .select(
      "batch_id, cluster_id, family, event_anchor, anchor_family, concept_key, canonical_title, review_status, preferred_candidate_id, preferred_title, batch_candidate_count, total_candidate_count, promoted_draft_id, updated_at",
    )
    .eq("batch_id", batchId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to list catalog import batch clusters: ${error.message}`,
    );
  }

  return (data ?? []).map((row) => mapBatchCluster(row as BatchClusterViewRow));
}

export async function getCatalogImportCluster(
  clusterId: string,
  client?: AppSupabaseClient,
): Promise<CatalogImportClusterDetail | null> {
  const supabase = await getAppSupabase(client);
  const [{ data: clusterRow, error: clusterError }, { data: candidateRows, error: candidateError }] =
    await Promise.all([
      supabase
        .from("catalog_import_clusters")
        .select(
          "id, family, event_anchor, anchor_family, concept_key, canonical_title, review_status, preferred_candidate_id, editorial_note, created_at, updated_at",
        )
        .eq("id", clusterId)
        .maybeSingle(),
      supabase
        .from("v_catalog_import_cluster_candidates")
        .select(
          "candidate_id, cluster_id, batch_id, batch_code, family, title, editor_state, preferred_in_cluster, machine_duplicate_state, machine_score, duplicate_of_candidate_id, duplicate_of_idea_id, linked_draft_id, source_row_number, specificity_level, event_anchor, anchor_family, editor_note, created_at, updated_at",
        )
        .eq("cluster_id", clusterId)
        .order("preferred_in_cluster", { ascending: false })
        .order("updated_at", { ascending: false }),
    ]);

  if (clusterError) {
    throw new Error(`Failed to load catalog import cluster: ${clusterError.message}`);
  }

  if (candidateError) {
    throw new Error(
      `Failed to load catalog import cluster candidates: ${candidateError.message}`,
    );
  }

  if (!clusterRow) {
    return null;
  }

  const candidates = sortClusterCandidates(
    (candidateRows ?? []).map((row) => mapClusterCandidate(row as ClusterCandidateViewRow)),
    clusterRow.preferred_candidate_id ?? null,
  );
  const preferredCandidate =
    candidates.find((candidate) => candidate.preferredInCluster) ??
    candidates.find((candidate) => candidate.candidateId === clusterRow.preferred_candidate_id) ??
    null;
  const promotedDraftId =
    preferredCandidate?.linkedDraftId ??
    candidates.find((candidate) => candidate.linkedDraftId)?.linkedDraftId ??
    null;

  return {
    clusterId: clusterRow.id,
    family: clusterRow.family,
    eventAnchor: clusterRow.event_anchor ?? null,
    anchorFamily: clusterRow.anchor_family ?? null,
    conceptKey: clusterRow.concept_key ?? null,
    canonicalTitle: clusterRow.canonical_title ?? null,
    reviewStatus: parseClusterReviewStatus(clusterRow.review_status),
    preferredCandidateId: clusterRow.preferred_candidate_id ?? null,
    preferredTitle: preferredCandidate?.title ?? null,
    editorialNote: clusterRow.editorial_note ?? null,
    createdAt: clusterRow.created_at,
    updatedAt: clusterRow.updated_at,
    promotedDraftId,
    candidates,
  };
}

export async function setCatalogImportPreferredCandidate(
  input: SetCatalogImportPreferredCandidateInput,
  client?: AppSupabaseClient,
): Promise<SetCatalogImportPreferredCandidateResult> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase.rpc(
    "catalog_import_set_preferred_candidate",
    {
      p_cluster_id: input.clusterId,
      p_candidate_id: input.candidateId,
      p_actor_user_id: input.actorUserId,
      p_note: normalizeNote(input.note),
    },
  );

  if (error) {
    throw new Error(`Failed to set preferred catalog import candidate: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Catalog intake contract error: preferred candidate RPC returned no row.");
  }

  return {
    clusterId: row.cluster_id,
    preferredCandidateId: row.preferred_candidate_id,
    canonicalTitle: row.canonical_title,
  };
}

export async function setCatalogImportCandidateAlternate(
  input: SetCatalogImportCandidateAlternateInput,
  client?: AppSupabaseClient,
): Promise<CatalogImportCandidateStateMutationResult> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase.rpc(
    "catalog_import_set_candidate_alternate",
    {
      p_candidate_id: input.candidateId,
      p_actor_user_id: input.actorUserId,
      p_note: normalizeNote(input.note),
    },
  );

  if (error) {
    throw new Error(`Failed to mark catalog import candidate alternate: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Catalog intake contract error: alternate RPC returned no row.");
  }

  return {
    candidateId: row.candidate_id,
    editorState: parseEditorState(row.editor_state),
  };
}

export async function markCatalogImportCandidateNeedsRewrite(
  input: MarkCatalogImportCandidateNeedsRewriteInput,
  client?: AppSupabaseClient,
): Promise<CatalogImportCandidateStateMutationResult> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase.rpc(
    "catalog_import_mark_candidate_needs_rewrite",
    {
      p_candidate_id: input.candidateId,
      p_actor_user_id: input.actorUserId,
      p_note: normalizeNote(input.note),
    },
  );

  if (error) {
    throw new Error(
      `Failed to mark catalog import candidate needs rewrite: ${error.message}`,
    );
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Catalog intake contract error: needs rewrite RPC returned no row.");
  }

  return {
    candidateId: row.candidate_id,
    editorState: parseEditorState(row.editor_state),
  };
}

export async function rejectCatalogImportCandidate(
  input: RejectCatalogImportCandidateInput,
  client?: AppSupabaseClient,
): Promise<CatalogImportCandidateStateMutationResult> {
  const supabase = await getAppSupabase(client);
  const reasonCode = normalizeRejectReasonCode(input.reasonCode);
  const { data, error } = await supabase.rpc("catalog_import_reject_candidate", {
    p_candidate_id: input.candidateId,
    p_actor_user_id: input.actorUserId,
    p_reason_code: reasonCode,
    p_note: normalizeNote(input.note),
  });

  if (error) {
    throw new Error(`Failed to reject catalog import candidate: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Catalog intake contract error: reject RPC returned no row.");
  }

  return {
    candidateId: row.candidate_id,
    editorState: parseEditorState(row.editor_state),
  };
}

export async function promoteCatalogImportCandidateToDraft(
  input: PromoteCatalogImportCandidateToDraftInput,
  client?: AppSupabaseClient,
): Promise<PromoteCatalogImportCandidateToDraftResult> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase.rpc(
    "catalog_import_promote_candidate_to_draft",
    {
      p_candidate_id: input.candidateId,
      p_actor_user_id: input.actorUserId,
    },
  );

  if (error) {
    throw new Error(`Failed to promote catalog import candidate: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("Catalog intake contract error: promote RPC returned no row.");
  }

  return {
    draftId: row.draft_id,
    created: row.created,
    warnings: normalizeWarnings(row.warnings),
  };
}

export async function getCatalogImportBatchByClusterId(
  clusterId: string,
  client?: AppSupabaseClient,
): Promise<string | null> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase
    .from("v_catalog_import_batch_clusters")
    .select("batch_id")
    .eq("cluster_id", clusterId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to resolve catalog import batch for cluster: ${error.message}`,
    );
  }

  return data?.batch_id ?? null;
}

export async function listCatalogImportClusterBatches(
  clusterId: string,
  client?: AppSupabaseClient,
): Promise<CatalogImportClusterBatchLink[]> {
  const supabase = await getAppSupabase(client);
  const { data, error } = await supabase
    .from("v_catalog_import_cluster_candidates")
    .select("batch_id, batch_code")
    .eq("cluster_id", clusterId);

  if (error) {
    throw new Error(
      `Failed to list catalog import candidate batch ids: ${error.message}`,
    );
  }

  const unique = new Map<string, CatalogImportClusterBatchLink>();

  for (const row of data ?? []) {
    if (!row.batch_id || !row.batch_code || unique.has(row.batch_id)) {
      continue;
    }

    unique.set(row.batch_id, {
      batchId: row.batch_id,
      batchCode: row.batch_code,
    });
  }

  return Array.from(unique.values()).sort((left, right) =>
    left.batchCode.localeCompare(right.batchCode),
  );
}
