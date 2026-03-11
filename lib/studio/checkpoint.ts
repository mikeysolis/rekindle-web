import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";

import { createSupabaseServerClient } from "@/lib/database/server";
import type { Database, Json } from "@/lib/database/types.gen";

type AppSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type CatalogImportBatchRow =
  Database["public"]["Tables"]["catalog_import_batches"]["Row"];
type CatalogImportClusterRow =
  Database["public"]["Tables"]["catalog_import_clusters"]["Row"];
type CatalogImportCandidateRow =
  Database["public"]["Tables"]["catalog_import_candidates"]["Row"];
type CatalogImportDecisionRow =
  Database["public"]["Tables"]["catalog_import_decisions"]["Row"];
type IdeaDraftRow = Database["public"]["Tables"]["idea_drafts"]["Row"];
type IdeaDraftTraitRow = Database["public"]["Tables"]["idea_draft_traits"]["Row"];
type IdeaRow = Database["public"]["Tables"]["ideas"]["Row"];
type IdeaTraitRow = Database["public"]["Tables"]["idea_traits"]["Row"];
type TraitTypeRow = Database["public"]["Tables"]["trait_types"]["Row"];
type TraitOptionRow = Database["public"]["Tables"]["trait_options"]["Row"];

export const CHECKPOINT_FORMAT_VERSION = "studio-checkpoint.v1";
export const NAMED_CHECKPOINT_DIRECTORY = join(
  process.cwd(),
  "checkpoints",
  "studio",
  "named",
);

export type CheckpointDraftTraitSelection = {
  id: string;
  draft_id: string;
  select_mode: string;
  trait_type_id: string;
  trait_option_id: string;
  trait_type_slug: string | null;
  trait_option_slug: string | null;
};

export type CheckpointIdeaTraitSelection = {
  id: string;
  idea_id: string;
  trait_select_mode: string;
  trait_type_id: string;
  trait_option_id: string;
  trait_type_slug: string | null;
  trait_option_slug: string | null;
};

export type CheckpointIdeaRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  reason_snippet: string | null;
  min_minutes: number | null;
  max_minutes: number | null;
  image_url: string | null;
  is_global: boolean;
  is_deleted: boolean;
  created_at: string;
  created_by_user_id: string | null;
  effort_id: string | null;
  default_cadence_tag_id: string | null;
  effort_slug: string | null;
  default_cadence_tag_slug: string | null;
};

export type CheckpointCounts = {
  batches: number;
  clusters: number;
  candidates: number;
  decisions: number;
  drafts: number;
  draft_traits: number;
  ideas: number;
  idea_traits: number;
  intake_count: number;
  draft_count: number;
  published_idea_count: number;
};

export type StudioCheckpointPackage = {
  metadata: {
    package_id: string;
    format_version: string;
    app_schema_version: string;
    created_at: string;
    source_environment: string;
    source_git_commit: string | null;
    created_by_user_id: string | null;
    checksum_sha256: string;
    counts: CheckpointCounts;
  };
  catalog_intake: {
    batches: CatalogImportBatchRow[];
    clusters: CatalogImportClusterRow[];
    candidates: CatalogImportCandidateRow[];
    decisions: CatalogImportDecisionRow[];
  };
  drafts: {
    rows: IdeaDraftRow[];
    trait_selections: CheckpointDraftTraitSelection[];
  };
  published_ideas: {
    rows: CheckpointIdeaRow[];
    trait_selections: CheckpointIdeaTraitSelection[];
  };
};

export type NamedCheckpointRecord = {
  fileName: string;
  relativePath: string;
  metadata: StudioCheckpointPackage["metadata"];
};

export type CurrentCheckpointCounts = Pick<
  CheckpointCounts,
  "intake_count" | "draft_count" | "published_idea_count"
>;

export type CheckpointRestoreDryRunReport = {
  fileName: string;
  metadata: StudioCheckpointPackage["metadata"] | null;
  actorUserId: string | null;
  payloadCounts: CheckpointCounts;
  targetTableCounts: {
    catalog_import_batches: number;
    catalog_import_clusters: number;
    catalog_import_candidates: number;
    catalog_import_decisions: number;
    idea_drafts: number;
    idea_draft_traits: number;
    ideas: number;
    idea_traits: number;
  };
  blockers: string[];
  warnings: string[];
  canRestore: boolean;
};

export type CheckpointRestoreResult = {
  fileName: string;
  metadata: StudioCheckpointPackage["metadata"];
  actorUserId: string | null;
  payloadCounts: CheckpointCounts;
  warnings: string[];
};

function getSourceEnvironmentLabel(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost")) {
    return "local";
  }

  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV;
  }

  return process.env.NODE_ENV ?? "unknown";
}

function formatCheckpointTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

function sanitizeLabel(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return cleaned || "checkpoint";
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function resolveNamedCheckpointPath(fileName: string): string {
  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    !fileName.endsWith(".checkpoint.json")
  ) {
    throw new Error("Invalid checkpoint file name.");
  }

  return join(NAMED_CHECKPOINT_DIRECTORY, fileName);
}

async function ensureNamedCheckpointDirectory(): Promise<void> {
  await mkdir(NAMED_CHECKPOINT_DIRECTORY, { recursive: true });
}

async function assertFileDoesNotExist(path: string): Promise<void> {
  try {
    await access(path, fsConstants.F_OK);
  } catch {
    return;
  }

  throw new Error("A named checkpoint with the same timestamp and label already exists.");
}

async function loadCatalogImportRows(supabase: AppSupabase) {
  const [
    { data: batches, error: batchesError },
    { data: clusters, error: clustersError },
    { data: candidates, error: candidatesError },
    { data: decisions, error: decisionsError },
  ] = await Promise.all([
    supabase.from("catalog_import_batches").select("*").order("created_at", {
      ascending: true,
    }),
    supabase.from("catalog_import_clusters").select("*").order("created_at", {
      ascending: true,
    }),
    supabase.from("catalog_import_candidates").select("*").order("created_at", {
      ascending: true,
    }),
    supabase.from("catalog_import_decisions").select("*").order("created_at", {
      ascending: true,
    }),
  ]);

  if (batchesError) {
    throw new Error(`Failed to load catalog import batches: ${batchesError.message}`);
  }

  if (clustersError) {
    throw new Error(`Failed to load catalog import clusters: ${clustersError.message}`);
  }

  if (candidatesError) {
    throw new Error(
      `Failed to load catalog import candidates: ${candidatesError.message}`,
    );
  }

  if (decisionsError) {
    throw new Error(
      `Failed to load catalog import decisions: ${decisionsError.message}`,
    );
  }

  return {
    batches: (batches ?? []) as CatalogImportBatchRow[],
    clusters: (clusters ?? []) as CatalogImportClusterRow[],
    candidates: (candidates ?? []) as CatalogImportCandidateRow[],
    decisions: (decisions ?? []) as CatalogImportDecisionRow[],
  };
}

async function loadDraftRows(supabase: AppSupabase) {
  const [{ data: drafts, error: draftsError }, { data: draftTraits, error: draftTraitsError }] =
    await Promise.all([
      supabase.from("idea_drafts").select("*").order("created_at", { ascending: true }),
      supabase
        .from("idea_draft_traits")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

  if (draftsError) {
    throw new Error(`Failed to load drafts: ${draftsError.message}`);
  }

  if (draftTraitsError) {
    throw new Error(`Failed to load draft traits: ${draftTraitsError.message}`);
  }

  return {
    drafts: (drafts ?? []) as IdeaDraftRow[],
    draftTraits: (draftTraits ?? []) as IdeaDraftTraitRow[],
  };
}

async function loadPublishedIdeaRows(
  supabase: AppSupabase,
  linkedIdeaIds: string[],
) {
  if (linkedIdeaIds.length === 0) {
    return {
      ideas: [] as IdeaRow[],
      ideaTraits: [] as IdeaTraitRow[],
    };
  }

  const [{ data: ideas, error: ideasError }, { data: ideaTraits, error: ideaTraitsError }] =
    await Promise.all([
      supabase
        .from("ideas")
        .select(
          "id, slug, title, description, reason_snippet, min_minutes, max_minutes, image_url, is_global, is_deleted, created_at, created_by_user_id, effort_id, default_cadence_tag_id",
        )
        .in("id", linkedIdeaIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("idea_traits")
        .select("*")
        .in("idea_id", linkedIdeaIds)
        .order("created_at", { ascending: true }),
    ]);

  if (ideasError) {
    throw new Error(`Failed to load published ideas: ${ideasError.message}`);
  }

  if (ideaTraitsError) {
    throw new Error(`Failed to load published idea traits: ${ideaTraitsError.message}`);
  }

  return {
    ideas: (ideas ?? []) as IdeaRow[],
    ideaTraits: (ideaTraits ?? []) as IdeaTraitRow[],
  };
}

async function loadTraitLookups(
  supabase: AppSupabase,
  traitTypeIds: string[],
  traitOptionIds: string[],
) {
  const uniqueTraitTypeIds = Array.from(new Set(traitTypeIds));
  const uniqueTraitOptionIds = Array.from(new Set(traitOptionIds));

  const [traitTypeResult, traitOptionResult] = await Promise.all([
    uniqueTraitTypeIds.length > 0
      ? supabase.from("trait_types").select("id, slug").in("id", uniqueTraitTypeIds)
      : Promise.resolve({ data: [], error: null }),
    uniqueTraitOptionIds.length > 0
      ? supabase
          .from("trait_options")
          .select("id, slug, trait_type_id")
          .in("id", uniqueTraitOptionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (traitTypeResult.error) {
    throw new Error(`Failed to load trait type slugs: ${traitTypeResult.error.message}`);
  }

  if (traitOptionResult.error) {
    throw new Error(
      `Failed to load trait option slugs: ${traitOptionResult.error.message}`,
    );
  }

  return {
    traitTypeSlugById: new Map(
      ((traitTypeResult.data ?? []) as Pick<TraitTypeRow, "id" | "slug">[]).map(
        (row) => [row.id, row.slug],
      ),
    ),
    traitOptionSlugById: new Map(
      ((traitOptionResult.data ?? []) as Pick<
        TraitOptionRow,
        "id" | "slug" | "trait_type_id"
      >[]).map((row) => [row.id, row.slug]),
    ),
  };
}

function mapDraftTraitSelections(
  rows: IdeaDraftTraitRow[],
  traitTypeSlugById: Map<string, string>,
  traitOptionSlugById: Map<string, string>,
): CheckpointDraftTraitSelection[] {
  return rows.map((row) => ({
    id: row.id,
    draft_id: row.draft_id,
    select_mode: row.select_mode,
    trait_type_id: row.trait_type_id,
    trait_option_id: row.trait_option_id,
    trait_type_slug: traitTypeSlugById.get(row.trait_type_id) ?? null,
    trait_option_slug: traitOptionSlugById.get(row.trait_option_id) ?? null,
  }));
}

function mapIdeaTraitSelections(
  rows: IdeaTraitRow[],
  traitTypeSlugById: Map<string, string>,
  traitOptionSlugById: Map<string, string>,
): CheckpointIdeaTraitSelection[] {
  return rows.map((row) => ({
    id: row.id,
    idea_id: row.idea_id,
    trait_select_mode: row.trait_select_mode,
    trait_type_id: row.trait_type_id,
    trait_option_id: row.trait_option_id,
    trait_type_slug: traitTypeSlugById.get(row.trait_type_id) ?? null,
    trait_option_slug: traitOptionSlugById.get(row.trait_option_id) ?? null,
  }));
}

function mapIdeaRows(
  rows: IdeaRow[],
  traitOptionSlugById: Map<string, string>,
): CheckpointIdeaRow[] {
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    reason_snippet: row.reason_snippet,
    min_minutes: row.min_minutes,
    max_minutes: row.max_minutes,
    image_url: row.image_url,
    is_global: row.is_global,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    created_by_user_id: row.created_by_user_id,
    effort_id: row.effort_id,
    default_cadence_tag_id: row.default_cadence_tag_id,
    effort_slug: row.effort_id ? traitOptionSlugById.get(row.effort_id) ?? null : null,
    default_cadence_tag_slug: row.default_cadence_tag_id
      ? traitOptionSlugById.get(row.default_cadence_tag_id) ?? null
      : null,
  }));
}

function buildCounts(input: {
  batches: CatalogImportBatchRow[];
  clusters: CatalogImportClusterRow[];
  candidates: CatalogImportCandidateRow[];
  decisions: CatalogImportDecisionRow[];
  drafts: IdeaDraftRow[];
  draftTraits: CheckpointDraftTraitSelection[];
  ideas: CheckpointIdeaRow[];
  ideaTraits: CheckpointIdeaTraitSelection[];
}): CheckpointCounts {
  return {
    batches: input.batches.length,
    clusters: input.clusters.length,
    candidates: input.candidates.length,
    decisions: input.decisions.length,
    drafts: input.drafts.length,
    draft_traits: input.draftTraits.length,
    ideas: input.ideas.length,
    idea_traits: input.ideaTraits.length,
    intake_count: input.candidates.length,
    draft_count: input.drafts.length,
    published_idea_count: input.ideas.length,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function readInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCheckpointCounts(value: unknown): CheckpointCounts {
  const record = isRecord(value) ? value : {};

  return {
    batches: readInteger(record.batches),
    clusters: readInteger(record.clusters),
    candidates: readInteger(record.candidates),
    decisions: readInteger(record.decisions),
    drafts: readInteger(record.drafts),
    draft_traits: readInteger(record.draft_traits),
    ideas: readInteger(record.ideas),
    idea_traits: readInteger(record.idea_traits),
    intake_count: readInteger(record.intake_count),
    draft_count: readInteger(record.draft_count),
    published_idea_count: readInteger(record.published_idea_count),
  };
}

function normalizeTargetTableCounts(value: unknown): CheckpointRestoreDryRunReport["targetTableCounts"] {
  const record = isRecord(value) ? value : {};

  return {
    catalog_import_batches: readInteger(record.catalog_import_batches),
    catalog_import_clusters: readInteger(record.catalog_import_clusters),
    catalog_import_candidates: readInteger(record.catalog_import_candidates),
    catalog_import_decisions: readInteger(record.catalog_import_decisions),
    idea_drafts: readInteger(record.idea_drafts),
    idea_draft_traits: readInteger(record.idea_draft_traits),
    ideas: readInteger(record.ideas),
    idea_traits: readInteger(record.idea_traits),
  };
}

function normalizeCheckpointMetadata(
  value: unknown,
  fallback: StudioCheckpointPackage["metadata"] | null,
): StudioCheckpointPackage["metadata"] | null {
  return isRecord(value) ? (value as StudioCheckpointPackage["metadata"]) : fallback;
}

function parseRestoreDryRunResponse(
  data: Json,
  fallbackMetadata: StudioCheckpointPackage["metadata"] | null,
): Omit<CheckpointRestoreDryRunReport, "fileName"> {
  const record = isRecord(data) ? data : {};

  return {
    metadata: normalizeCheckpointMetadata(record.metadata, fallbackMetadata),
    actorUserId: typeof record.actor_user_id === "string" ? record.actor_user_id : null,
    payloadCounts: normalizeCheckpointCounts(record.payload_counts),
    targetTableCounts: normalizeTargetTableCounts(record.target_table_counts),
    blockers: readStringArray(record.blockers),
    warnings: readStringArray(record.warnings),
    canRestore: record.can_restore === true,
  };
}

function parseRestoreResponse(
  data: Json,
  fallbackMetadata: StudioCheckpointPackage["metadata"],
): Omit<CheckpointRestoreResult, "fileName"> {
  const record = isRecord(data) ? data : {};

  return {
    metadata: normalizeCheckpointMetadata(record.metadata, fallbackMetadata) ?? fallbackMetadata,
    actorUserId: typeof record.actor_user_id === "string" ? record.actor_user_id : null,
    payloadCounts: normalizeCheckpointCounts(record.payload_counts),
    warnings: readStringArray(record.warnings),
  };
}

export async function buildStudioCheckpointPackage(input?: {
  actorUserId?: string | null;
}): Promise<StudioCheckpointPackage> {
  const supabase = await createSupabaseServerClient();
  const [catalogIntake, draftData] = await Promise.all([
    loadCatalogImportRows(supabase),
    loadDraftRows(supabase),
  ]);

  const linkedIdeaIds = Array.from(
    new Set(
      draftData.drafts
        .map((draft) => draft.idea_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const publishedIdeas = await loadPublishedIdeaRows(supabase, linkedIdeaIds);

  const traitTypeIds = [
    ...draftData.draftTraits.map((row) => row.trait_type_id),
    ...publishedIdeas.ideaTraits.map((row) => row.trait_type_id),
  ];
  const traitOptionIds = [
    ...draftData.draftTraits.map((row) => row.trait_option_id),
    ...publishedIdeas.ideaTraits.map((row) => row.trait_option_id),
    ...publishedIdeas.ideas
      .map((row) => row.effort_id)
      .filter((value): value is string => Boolean(value)),
    ...publishedIdeas.ideas
      .map((row) => row.default_cadence_tag_id)
      .filter((value): value is string => Boolean(value)),
  ];

  const { traitTypeSlugById, traitOptionSlugById } = await loadTraitLookups(
    supabase,
    traitTypeIds,
    traitOptionIds,
  );

  const draftTraitSelections = mapDraftTraitSelections(
    draftData.draftTraits,
    traitTypeSlugById,
    traitOptionSlugById,
  );
  const ideaTraitSelections = mapIdeaTraitSelections(
    publishedIdeas.ideaTraits,
    traitTypeSlugById,
    traitOptionSlugById,
  );
  const ideaRows = mapIdeaRows(publishedIdeas.ideas, traitOptionSlugById);
  const counts = buildCounts({
    batches: catalogIntake.batches,
    clusters: catalogIntake.clusters,
    candidates: catalogIntake.candidates,
    decisions: catalogIntake.decisions,
    drafts: draftData.drafts,
    draftTraits: draftTraitSelections,
    ideas: ideaRows,
    ideaTraits: ideaTraitSelections,
  });

  const metadataWithoutChecksum = {
    package_id: randomUUID(),
    format_version: CHECKPOINT_FORMAT_VERSION,
    app_schema_version: CHECKPOINT_FORMAT_VERSION,
    created_at: new Date().toISOString(),
    source_environment: getSourceEnvironmentLabel(),
    source_git_commit: null,
    created_by_user_id: input?.actorUserId ?? null,
    checksum_sha256: "",
    counts,
  };

  const packageWithoutChecksum: StudioCheckpointPackage = {
    metadata: metadataWithoutChecksum,
    catalog_intake: catalogIntake,
    drafts: {
      rows: draftData.drafts,
      trait_selections: draftTraitSelections,
    },
    published_ideas: {
      rows: ideaRows,
      trait_selections: ideaTraitSelections,
    },
  };

  const checksum = sha256(JSON.stringify(packageWithoutChecksum));

  return {
    ...packageWithoutChecksum,
    metadata: {
      ...metadataWithoutChecksum,
      checksum_sha256: checksum,
    },
  };
}

export async function createNamedStudioCheckpoint(input: {
  label: string;
  actorUserId?: string | null;
}): Promise<NamedCheckpointRecord> {
  const packageData = await buildStudioCheckpointPackage({
    actorUserId: input.actorUserId ?? null,
  });

  await ensureNamedCheckpointDirectory();

  const timestamp = formatCheckpointTimestamp(new Date());
  const label = sanitizeLabel(input.label);
  const fileName = `${timestamp}--${label}.checkpoint.json`;
  const absolutePath = join(NAMED_CHECKPOINT_DIRECTORY, fileName);
  const tempPath = `${absolutePath}.tmp`;
  const relativePath = `checkpoints/studio/named/${fileName}`;

  await assertFileDoesNotExist(absolutePath);

  const fileContents = `${JSON.stringify(packageData, null, 2)}\n`;

  await writeFile(tempPath, fileContents, "utf8");

  const parsed = JSON.parse(await readFile(tempPath, "utf8")) as StudioCheckpointPackage;

  if (parsed.metadata.checksum_sha256 !== packageData.metadata.checksum_sha256) {
    throw new Error("Checkpoint checksum mismatch after temporary write.");
  }

  await rename(tempPath, absolutePath);

  return {
    fileName,
    relativePath,
    metadata: packageData.metadata,
  };
}

export async function listNamedStudioCheckpoints(): Promise<NamedCheckpointRecord[]> {
  await ensureNamedCheckpointDirectory();

  const entries = await readdir(NAMED_CHECKPOINT_DIRECTORY, {
    withFileTypes: true,
  });

  const checkpointFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".checkpoint.json"))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  const records = await Promise.all(
    checkpointFiles.map(async (fileName) => {
      try {
        const absolutePath = join(NAMED_CHECKPOINT_DIRECTORY, fileName);
        const content = await readFile(absolutePath, "utf8");
        const parsed = JSON.parse(content) as StudioCheckpointPackage;

        return {
          fileName,
          relativePath: `checkpoints/studio/named/${fileName}`,
          metadata: parsed.metadata,
        } satisfies NamedCheckpointRecord;
      } catch {
        return null;
      }
    }),
  );

  return records.filter(
    (record): record is NamedCheckpointRecord => record !== null,
  );
}

export async function getCurrentStudioCheckpointCounts(): Promise<CurrentCheckpointCounts> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: candidateCount, error: candidateError },
    { count: draftCount, error: draftError },
    { data: linkedDraftIdeas, error: linkedDraftIdeasError },
  ] = await Promise.all([
    supabase
      .from("catalog_import_candidates")
      .select("id", { count: "exact", head: true }),
    supabase.from("idea_drafts").select("id", { count: "exact", head: true }),
    supabase.from("idea_drafts").select("idea_id").not("idea_id", "is", null),
  ]);

  if (candidateError) {
    throw new Error(`Failed to count catalog intake items: ${candidateError.message}`);
  }

  if (draftError) {
    throw new Error(`Failed to count drafts: ${draftError.message}`);
  }

  if (linkedDraftIdeasError) {
    throw new Error(
      `Failed to count published ideas linked from drafts: ${linkedDraftIdeasError.message}`,
    );
  }

  const publishedIdeaCount = new Set(
    (linkedDraftIdeas ?? [])
      .map((row) => row.idea_id)
      .filter((value): value is string => Boolean(value)),
  ).size;

  return {
    intake_count: candidateCount ?? 0,
    draft_count: draftCount ?? 0,
    published_idea_count: publishedIdeaCount,
  };
}

export async function loadNamedStudioCheckpoint(
  fileName: string,
): Promise<StudioCheckpointPackage> {
  await ensureNamedCheckpointDirectory();
  const absolutePath = resolveNamedCheckpointPath(fileName);
  const content = await readFile(absolutePath, "utf8");

  return JSON.parse(content) as StudioCheckpointPackage;
}

export async function dryRunNamedStudioCheckpointRestore(
  fileName: string,
  input: {
    actorUserId: string;
  },
): Promise<CheckpointRestoreDryRunReport> {
  const packageData = await loadNamedStudioCheckpoint(fileName);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("studio_restore_checkpoint_dry_run", {
    p_actor_user_id: input.actorUserId,
    p_payload: packageData as unknown as Json,
  });

  if (error) {
    throw new Error(`Failed to dry-run checkpoint restore: ${error.message}`);
  }

  const report = parseRestoreDryRunResponse(data, packageData.metadata);

  return {
    ...report,
    fileName,
  };
}

export async function restoreNamedStudioCheckpoint(
  fileName: string,
  input: {
    actorUserId: string;
  },
): Promise<CheckpointRestoreResult> {
  const packageData = await loadNamedStudioCheckpoint(fileName);
  const supabase = await createSupabaseServerClient();
  const dryRun = await dryRunNamedStudioCheckpointRestore(fileName, input);

  if (!dryRun.canRestore || !dryRun.metadata) {
    throw new Error(
      dryRun.blockers[0] ?? "Checkpoint restore is blocked by validation errors.",
    );
  }

  const { data, error } = await supabase.rpc("studio_restore_checkpoint", {
    p_actor_user_id: input.actorUserId,
    p_payload: packageData as unknown as Json,
  });

  if (error) {
    throw new Error(`Failed to restore checkpoint: ${error.message}`);
  }

  return {
    ...parseRestoreResponse(data, packageData.metadata),
    fileName,
  };
}
