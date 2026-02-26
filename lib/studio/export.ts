import type { IdeaDraft } from "@/lib/studio/drafts";
import { evaluatePublishGate, type TraitSelectionsByTypeSlug } from "@/lib/studio/publish-gate";
import type { IdeaTraitBinding } from "@/lib/studio/registry-types";
import {
  EXPORT_COLUMN_ORDER,
  MULTI_TRAIT_TYPES,
  TRAIT_EXPORT_COLUMN_BY_TYPE,
  type ExportColumn,
} from "@/lib/studio/trait-mapping";

export type ExportRow = Record<ExportColumn, string>;

export type ExportBuildResult = {
  rows: ExportRow[];
  includedDraftIds: string[];
  skippedDraftIds: string[];
};

function createEmptyRow(): ExportRow {
  const row = {} as ExportRow;

  for (const column of EXPORT_COLUMN_ORDER) {
    row[column] = "";
  }

  return row;
}

function toCsvSafeValue(value: string): string {
  if (value.includes('"')) {
    value = value.replaceAll('"', '""');
  }

  if (value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes('"')) {
    return `"${value}"`;
  }

  return value;
}

function nullableText(value: string | null | undefined): string {
  return value ?? "";
}

function nullableNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function joinValues(values: string[]): string {
  return values.join(",");
}

export function mapDraftToExportRow(
  draft: IdeaDraft,
  traitSelectionsByTypeSlug: TraitSelectionsByTypeSlug,
): ExportRow {
  const row = createEmptyRow();

  row.title = nullableText(draft.title);
  row.reason_snippet = nullableText(draft.reasonSnippet);
  row.description = nullableText(draft.description);
  row.steps = nullableText(draft.steps);
  row.what_you_need = nullableText(draft.whatYouNeed);
  row.tips_or_variations = nullableText(draft.tipsOrVariations);
  row.safety_or_boundaries_note = nullableText(draft.safetyOrBoundariesNote);
  row.min_minutes = nullableNumber(draft.minMinutes);
  row.max_minutes = nullableNumber(draft.maxMinutes);
  row.active = draft.active ? "true" : "false";
  row.status = draft.status;
  row.editorial_note = nullableText(draft.editorialNote);
  row.source = nullableText(draft.sourceUrl);

  for (const [traitTypeSlug, column] of Object.entries(TRAIT_EXPORT_COLUMN_BY_TYPE)) {
    const selected = traitSelectionsByTypeSlug[traitTypeSlug] ?? [];

    if (MULTI_TRAIT_TYPES.has(traitTypeSlug)) {
      row[column] = joinValues(selected);
      continue;
    }

    row[column] = selected[0] ?? "";
  }

  return row;
}

export function buildExportRows(
  drafts: IdeaDraft[],
  selectionsByDraftId: Record<string, TraitSelectionsByTypeSlug>,
  ideaBindings: IdeaTraitBinding[],
): ExportBuildResult {
  const rows: ExportRow[] = [];
  const includedDraftIds: string[] = [];
  const skippedDraftIds: string[] = [];

  for (const draft of drafts) {
    const traitSelections = selectionsByDraftId[draft.id] ?? {};
    const gate = evaluatePublishGate({
      title: draft.title,
      reasonSnippet: draft.reasonSnippet,
      description: draft.description,
      minMinutes: draft.minMinutes,
      maxMinutes: draft.maxMinutes,
      traitSelectionsByTypeSlug: traitSelections,
      bindings: ideaBindings,
    });

    if (!gate.isPublishable) {
      skippedDraftIds.push(draft.id);
      continue;
    }

    rows.push(mapDraftToExportRow(draft, traitSelections));
    includedDraftIds.push(draft.id);
  }

  return {
    rows,
    includedDraftIds,
    skippedDraftIds,
  };
}

export function serializeExportRowsToCsv(rows: ExportRow[]): string {
  const header = EXPORT_COLUMN_ORDER.join(",");

  const lines = rows.map((row) =>
    EXPORT_COLUMN_ORDER.map((column) => toCsvSafeValue(row[column] ?? "")).join(","),
  );

  return [header, ...lines].join("\n");
}
