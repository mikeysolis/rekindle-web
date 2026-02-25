import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/database/server";
import {
  evaluatePublishGate,
  type PublishGateResult,
  type TraitSelectionsByTypeSlug,
} from "@/lib/studio/publish-gate";
import type { IdeaTraitBinding } from "@/lib/studio/registry";

export const DRAFT_STATUSES = [
  "draft",
  "review",
  "publishable",
  "exported",
] as const;

export type DraftStatus = (typeof DRAFT_STATUSES)[number];

const draftStatusSchema = z.enum(DRAFT_STATUSES);

export type IdeaDraft = {
  id: string;
  title: string | null;
  reasonSnippet: string | null;
  description: string | null;
  steps: string | null;
  whatYouNeed: string | null;
  tipsOrVariations: string | null;
  safetyOrBoundariesNote: string | null;
  minMinutes: number | null;
  maxMinutes: number | null;
  active: boolean;
  status: DraftStatus;
  sourceUrl: string | null;
  editorialNote: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DraftEditableFields = {
  title: string | null;
  reasonSnippet: string | null;
  description: string | null;
  steps: string | null;
  whatYouNeed: string | null;
  tipsOrVariations: string | null;
  safetyOrBoundariesNote: string | null;
  minMinutes: number | null;
  maxMinutes: number | null;
  active: boolean;
  sourceUrl: string | null;
  editorialNote: string | null;
};

export type SaveDraftInput = {
  draftId: string;
  updatedByUserId: string;
  nextStatus: DraftStatus;
  baseFields: DraftEditableFields;
  traitSelectionsByTypeSlug: TraitSelectionsByTypeSlug;
  bindings: IdeaTraitBinding[];
};

export type SaveDraftResult = {
  ok: boolean;
  status: DraftStatus;
  gate: PublishGateResult;
  message?: string;
};

const ALLOWED_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  draft: ["draft", "review"],
  review: ["review", "draft", "publishable"],
  publishable: ["publishable", "review", "draft", "exported"],
  exported: ["exported", "publishable", "review", "draft"],
};

type RawDraftRow = {
  id: string;
  title?: string | null;
  reason_snippet?: string | null;
  description?: string | null;
  steps?: string | null;
  what_you_need?: string | null;
  tips_or_variations?: string | null;
  safety_or_boundaries_note?: string | null;
  min_minutes?: number | null;
  max_minutes?: number | null;
  active?: boolean | null;
  status?: string | null;
  source_url?: string | null;
  editorial_note?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function parseDraftStatus(value: unknown): DraftStatus {
  const parsed = draftStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "draft";
}

export function parseDraftEditableFields(
  formData: FormData,
): DraftEditableFields {
  return {
    title: normalizeText(formData.get("title")),
    reasonSnippet: normalizeText(formData.get("reason_snippet")),
    description: normalizeText(formData.get("description")),
    steps: normalizeText(formData.get("steps")),
    whatYouNeed: normalizeText(formData.get("what_you_need")),
    tipsOrVariations: normalizeText(formData.get("tips_or_variations")),
    safetyOrBoundariesNote: normalizeText(
      formData.get("safety_or_boundaries_note"),
    ),
    minMinutes: normalizeInt(formData.get("min_minutes")),
    maxMinutes: normalizeInt(formData.get("max_minutes")),
    active: formData.get("active") === "on",
    sourceUrl: normalizeText(formData.get("source_url")),
    editorialNote: normalizeText(formData.get("editorial_note")),
  };
}

export function extractTraitSelectionsFromFormData(
  formData: FormData,
  bindings: IdeaTraitBinding[],
): TraitSelectionsByTypeSlug {
  const selections: TraitSelectionsByTypeSlug = {};

  for (const binding of bindings) {
    const key = `trait:${binding.traitTypeSlug}`;
    const values = formData
      .getAll(key)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    const validOptionSlugs = new Set(binding.options.map((option) => option.slug));
    const uniqueValidValues = Array.from(new Set(values)).filter((value) =>
      validOptionSlugs.has(value),
    );

    selections[binding.traitTypeSlug] =
      binding.selectMode === "single"
        ? uniqueValidValues.slice(0, 1)
        : uniqueValidValues;
  }

  return selections;
}

function mapRawDraftRow(row: RawDraftRow): IdeaDraft {
  return {
    id: row.id,
    title: row.title ?? null,
    reasonSnippet: row.reason_snippet ?? null,
    description: row.description ?? null,
    steps: row.steps ?? null,
    whatYouNeed: row.what_you_need ?? null,
    tipsOrVariations: row.tips_or_variations ?? null,
    safetyOrBoundariesNote: row.safety_or_boundaries_note ?? null,
    minMinutes: row.min_minutes ?? null,
    maxMinutes: row.max_minutes ?? null,
    active: row.active ?? true,
    status: parseDraftStatus(row.status),
    sourceUrl: row.source_url ?? null,
    editorialNote: row.editorial_note ?? null,
    createdBy: row.created_by ?? null,
    updatedBy: row.updated_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function isStatusTransitionAllowed(
  currentStatus: DraftStatus,
  nextStatus: DraftStatus,
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}

export async function createDraft(createdByUserId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("idea_drafts")
    .insert({
      status: "draft",
      active: true,
      created_by: createdByUserId,
      updated_by: createdByUserId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create draft: ${error.message}`);
  }

  return data.id;
}

export async function getDraftById(draftId: string): Promise<IdeaDraft | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("idea_drafts")
    .select(
      "id, title, reason_snippet, description, steps, what_you_need, tips_or_variations, safety_or_boundaries_note, min_minutes, max_minutes, active, status, source_url, editorial_note, created_by, updated_by, created_at, updated_at",
    )
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load draft: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapRawDraftRow(data as RawDraftRow);
}

export async function listDrafts(): Promise<IdeaDraft[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("idea_drafts")
    .select(
      "id, title, reason_snippet, description, min_minutes, max_minutes, active, status, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list drafts: ${error.message}`);
  }

  return (data ?? []).map((row) => mapRawDraftRow(row as RawDraftRow));
}

export async function listDraftsByStatus(status: DraftStatus): Promise<IdeaDraft[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("idea_drafts")
    .select(
      "id, title, reason_snippet, description, steps, what_you_need, tips_or_variations, safety_or_boundaries_note, min_minutes, max_minutes, active, status, source_url, editorial_note, updated_at",
    )
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list drafts by status: ${error.message}`);
  }

  return (data ?? []).map((row) => mapRawDraftRow(row as RawDraftRow));
}

export async function getTraitSelectionsForDraftIds(
  draftIds: string[],
): Promise<Record<string, TraitSelectionsByTypeSlug>> {
  if (draftIds.length === 0) {
    return {};
  }

  const supabase = await createSupabaseServerClient();
  const initial: Record<string, TraitSelectionsByTypeSlug> = {};

  for (const draftId of draftIds) {
    initial[draftId] = {};
  }

  const { data: linkRows, error: linkError } = await supabase
    .from("idea_draft_traits")
    .select("draft_id, trait_type_id, trait_option_id")
    .in("draft_id", draftIds);

  if (linkError) {
    throw new Error(`Failed to load draft traits: ${linkError.message}`);
  }

  if (!linkRows || linkRows.length === 0) {
    return initial;
  }

  const traitTypeIds = Array.from(
    new Set(linkRows.map((row) => row.trait_type_id as string)),
  );
  const traitOptionIds = Array.from(
    new Set(linkRows.map((row) => row.trait_option_id as string)),
  );

  const [{ data: typeRows, error: typeError }, { data: optionRows, error: optionError }] =
    await Promise.all([
      supabase
        .from("trait_types")
        .select("id, slug")
        .in("id", traitTypeIds),
      supabase
        .from("trait_options")
        .select("id, slug")
        .in("id", traitOptionIds),
    ]);

  if (typeError) {
    throw new Error(`Failed to load trait type slugs: ${typeError.message}`);
  }

  if (optionError) {
    throw new Error(`Failed to load trait option slugs: ${optionError.message}`);
  }

  const traitTypeSlugById = new Map(
    (typeRows ?? []).map((row) => [row.id as string, row.slug as string]),
  );
  const traitOptionSlugById = new Map(
    (optionRows ?? []).map((row) => [row.id as string, row.slug as string]),
  );

  for (const row of linkRows) {
    const draftId = row.draft_id as string;
    const traitTypeSlug = traitTypeSlugById.get(row.trait_type_id as string);
    const traitOptionSlug = traitOptionSlugById.get(row.trait_option_id as string);

    if (!traitTypeSlug || !traitOptionSlug) {
      continue;
    }

    const byType = initial[draftId] ?? {};
    const existing = byType[traitTypeSlug] ?? [];

    if (!existing.includes(traitOptionSlug)) {
      existing.push(traitOptionSlug);
    }

    byType[traitTypeSlug] = existing;
    initial[draftId] = byType;
  }

  for (const byType of Object.values(initial)) {
    for (const key of Object.keys(byType)) {
      byType[key].sort((a, b) => a.localeCompare(b));
    }
  }

  return initial;
}

export async function getTraitSelectionsForDraft(
  draftId: string,
): Promise<TraitSelectionsByTypeSlug> {
  const map = await getTraitSelectionsForDraftIds([draftId]);
  return map[draftId] ?? {};
}

async function syncDraftTraits(
  draftId: string,
  selectionsByTypeSlug: TraitSelectionsByTypeSlug,
  bindings: IdeaTraitBinding[],
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const insertRows: {
    draft_id: string;
    trait_type_id: string;
    trait_option_id: string;
    select_mode: "single" | "multi";
  }[] = [];

  for (const binding of bindings) {
    const selected = selectionsByTypeSlug[binding.traitTypeSlug] ?? [];
    const optionBySlug = new Map(
      binding.options
        .filter((option) => !option.isDeprecated)
        .map((option) => [option.slug, option]),
    );

    const normalized =
      binding.selectMode === "single"
        ? selected.slice(0, 1)
        : Array.from(new Set(selected));

    for (const optionSlug of normalized) {
      const option = optionBySlug.get(optionSlug);

      if (!option) {
        continue;
      }

      insertRows.push({
        draft_id: draftId,
        trait_type_id: binding.traitTypeId,
        trait_option_id: option.id,
        select_mode: binding.selectMode,
      });
    }
  }

  const { error: deleteError } = await supabase
    .from("idea_draft_traits")
    .delete()
    .eq("draft_id", draftId);

  if (deleteError) {
    throw new Error(`Failed to clear draft traits: ${deleteError.message}`);
  }

  if (insertRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("idea_draft_traits")
    .insert(insertRows);

  if (insertError) {
    throw new Error(`Failed to save draft traits: ${insertError.message}`);
  }
}

export async function saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  const supabase = await createSupabaseServerClient();

  const { data: currentRow, error: currentRowError } = await supabase
    .from("idea_drafts")
    .select("status")
    .eq("id", input.draftId)
    .maybeSingle();

  if (currentRowError) {
    throw new Error(`Failed to read current draft status: ${currentRowError.message}`);
  }

  if (!currentRow) {
    return {
      ok: false,
      status: "draft",
      gate: {
        isPublishable: false,
        missingBaseFields: ["draft_not_found"],
        missingTraitTypeSlugs: [],
        warnings: [],
      },
      message: "Draft not found.",
    };
  }

  const currentStatus = parseDraftStatus(currentRow.status);

  if (!isStatusTransitionAllowed(currentStatus, input.nextStatus)) {
    return {
      ok: false,
      status: currentStatus,
      gate: {
        isPublishable: false,
        missingBaseFields: ["status_transition_invalid"],
        missingTraitTypeSlugs: [],
        warnings: [],
      },
      message: `Cannot move from ${currentStatus} to ${input.nextStatus}.`,
    };
  }

  const gate = evaluatePublishGate({
    title: input.baseFields.title,
    reasonSnippet: input.baseFields.reasonSnippet,
    description: input.baseFields.description,
    minMinutes: input.baseFields.minMinutes,
    maxMinutes: input.baseFields.maxMinutes,
    traitSelectionsByTypeSlug: input.traitSelectionsByTypeSlug,
    bindings: input.bindings,
  });

  if (input.nextStatus === "publishable" && !gate.isPublishable) {
    return {
      ok: false,
      status: currentStatus,
      gate,
      message: "Publish gate is not satisfied.",
    };
  }

  const { error: updateError } = await supabase
    .from("idea_drafts")
    .update({
      title: input.baseFields.title,
      reason_snippet: input.baseFields.reasonSnippet,
      description: input.baseFields.description,
      steps: input.baseFields.steps,
      what_you_need: input.baseFields.whatYouNeed,
      tips_or_variations: input.baseFields.tipsOrVariations,
      safety_or_boundaries_note: input.baseFields.safetyOrBoundariesNote,
      min_minutes: input.baseFields.minMinutes,
      max_minutes: input.baseFields.maxMinutes,
      active: input.baseFields.active,
      source_url: input.baseFields.sourceUrl,
      editorial_note: input.baseFields.editorialNote,
      status: input.nextStatus,
      updated_by: input.updatedByUserId,
    })
    .eq("id", input.draftId);

  if (updateError) {
    throw new Error(`Failed to update draft: ${updateError.message}`);
  }

  await syncDraftTraits(
    input.draftId,
    input.traitSelectionsByTypeSlug,
    input.bindings,
  );

  return {
    ok: true,
    status: input.nextStatus,
    gate,
  };
}
