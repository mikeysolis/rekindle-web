"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import PublishGatePanel from "@/components/studio/PublishGatePanel";
import TraitPicker from "@/components/studio/TraitPicker";
import {
  evaluatePublishGate,
  type TraitSelectionsByTypeSlug,
} from "@/lib/studio/publish-gate";
import type { IdeaTraitBinding } from "@/lib/studio/registry-types";

type DraftEditorFormDraft = {
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
  status: string;
  sourceUrl: string | null;
  editorialNote: string | null;
};

type DraftEditorFormProps = {
  draft: DraftEditorFormDraft;
  bindings: IdeaTraitBinding[];
  initialTraitSelections: TraitSelectionsByTypeSlug;
  canEdit: boolean;
  transitionOptions: string[];
  action: (formData: FormData) => void | Promise<void>;
};

type FormState = {
  title: string;
  reasonSnippet: string;
  description: string;
  steps: string;
  whatYouNeed: string;
  tipsOrVariations: string;
  safetyOrBoundariesNote: string;
  minMinutes: string;
  maxMinutes: string;
  active: boolean;
  sourceUrl: string;
  editorialNote: string;
  nextStatus: string;
  traitSelectionsByTypeSlug: TraitSelectionsByTypeSlug;
};

const BASE_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  reason_snippet: "Reason snippet",
  description: "Description",
  min_minutes: "Min minutes",
  max_minutes: "Max minutes",
  minutes_range: "Minutes range",
};

const BASE_FIELD_INPUT_IDS: Record<string, string> = {
  title: "draft-title",
  reason_snippet: "draft-reason-snippet",
  description: "draft-description",
  min_minutes: "draft-min-minutes",
  max_minutes: "draft-max-minutes",
  minutes_range: "draft-min-minutes",
};

const INPUT_CLASSNAME =
  "w-full rounded border px-3 py-2";

const TEXTAREA_CLASSNAME =
  "w-full rounded border px-3 py-2";

const TIERS: Array<1 | 2 | 3> = [1, 2, 3];

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFieldClassName(isMissing: boolean): string {
  return `${INPUT_CLASSNAME} ${
    isMissing ? "border-red-300 bg-red-50" : "border-zinc-300"
  }`;
}

function getTextAreaClassName(isMissing: boolean, minHeightClass: string): string {
  return `${TEXTAREA_CLASSNAME} ${minHeightClass} ${
    isMissing ? "border-red-300 bg-red-50" : "border-zinc-300"
  }`;
}

function buildTraitLabelMap(bindings: IdeaTraitBinding[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const binding of bindings) {
    map[binding.traitTypeSlug] = `${binding.traitTypeLabel} (${binding.traitTypeSlug})`;
  }

  return map;
}

function normalizeTraitSelections(
  bindings: IdeaTraitBinding[],
  source: TraitSelectionsByTypeSlug,
): TraitSelectionsByTypeSlug {
  const normalized: TraitSelectionsByTypeSlug = {};

  for (const binding of bindings) {
    const validSlugs = new Set(binding.options.map((option) => option.slug));
    const unique = Array.from(new Set(source[binding.traitTypeSlug] ?? [])).filter(
      (slug) => validSlugs.has(slug),
    );

    if (binding.selectMode === "single") {
      normalized[binding.traitTypeSlug] = unique.slice(0, 1);
      continue;
    }

    const orderBySlug = new Map(
      binding.options.map((option, index) => [option.slug, index]),
    );

    normalized[binding.traitTypeSlug] = unique.sort((a, b) => {
      const aOrder = orderBySlug.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = orderBySlug.get(b) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }

  return normalized;
}

function toComparableSnapshot(state: FormState, bindings: IdeaTraitBinding[]) {
  return {
    title: state.title,
    reasonSnippet: state.reasonSnippet,
    description: state.description,
    steps: state.steps,
    whatYouNeed: state.whatYouNeed,
    tipsOrVariations: state.tipsOrVariations,
    safetyOrBoundariesNote: state.safetyOrBoundariesNote,
    minMinutes: state.minMinutes,
    maxMinutes: state.maxMinutes,
    active: state.active,
    sourceUrl: state.sourceUrl,
    editorialNote: state.editorialNote,
    nextStatus: state.nextStatus,
    traitSelectionsByTypeSlug: normalizeTraitSelections(
      bindings,
      state.traitSelectionsByTypeSlug,
    ),
  };
}

function SaveButton({
  canEdit,
  isDirty,
}: {
  canEdit: boolean;
  isDirty: boolean;
}) {
  const { pending } = useFormStatus();
  const disabled = !canEdit || !isDirty || pending;

  let label = "Save changes";

  if (!isDirty) {
    label = "No changes";
  }

  if (pending) {
    label = "Saving...";
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`w-full rounded px-4 py-2 text-sm text-white ${
        disabled ? "bg-zinc-400" : "bg-zinc-900 hover:bg-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function DraftEditorForm({
  draft,
  bindings,
  initialTraitSelections,
  canEdit,
  transitionOptions,
  action,
}: DraftEditorFormProps) {
  const normalizedInitialTraitSelections = useMemo(
    () => normalizeTraitSelections(bindings, initialTraitSelections),
    [bindings, initialTraitSelections],
  );

  const initialState = useMemo<FormState>(
    () => ({
      title: draft.title ?? "",
      reasonSnippet: draft.reasonSnippet ?? "",
      description: draft.description ?? "",
      steps: draft.steps ?? "",
      whatYouNeed: draft.whatYouNeed ?? "",
      tipsOrVariations: draft.tipsOrVariations ?? "",
      safetyOrBoundariesNote: draft.safetyOrBoundariesNote ?? "",
      minMinutes: draft.minMinutes === null ? "" : String(draft.minMinutes),
      maxMinutes: draft.maxMinutes === null ? "" : String(draft.maxMinutes),
      active: draft.active,
      sourceUrl: draft.sourceUrl ?? "",
      editorialNote: draft.editorialNote ?? "",
      nextStatus: draft.status,
      traitSelectionsByTypeSlug: normalizedInitialTraitSelections,
    }),
    [draft, normalizedInitialTraitSelections],
  );

  const [state, setState] = useState<FormState>(initialState);

  const normalizedCurrentTraitSelections = useMemo(
    () => normalizeTraitSelections(bindings, state.traitSelectionsByTypeSlug),
    [bindings, state.traitSelectionsByTypeSlug],
  );

  const gate = useMemo(
    () =>
      evaluatePublishGate({
        title: normalizeText(state.title),
        reasonSnippet: normalizeText(state.reasonSnippet),
        description: normalizeText(state.description),
        minMinutes: parseOptionalInt(state.minMinutes),
        maxMinutes: parseOptionalInt(state.maxMinutes),
        traitSelectionsByTypeSlug: normalizedCurrentTraitSelections,
        bindings,
      }),
    [bindings, normalizedCurrentTraitSelections, state],
  );

  const initialSnapshot = useMemo(
    () => toComparableSnapshot(initialState, bindings),
    [bindings, initialState],
  );

  const currentSnapshot = useMemo(
    () =>
      toComparableSnapshot(
        {
          ...state,
          traitSelectionsByTypeSlug: normalizedCurrentTraitSelections,
        },
        bindings,
      ),
    [bindings, normalizedCurrentTraitSelections, state],
  );

  const isDirty = useMemo(
    () => JSON.stringify(initialSnapshot) !== JSON.stringify(currentSnapshot),
    [currentSnapshot, initialSnapshot],
  );

  const traitLabelMap = useMemo(() => buildTraitLabelMap(bindings), [bindings]);

  const missingBaseFieldSet = useMemo(
    () => new Set(gate.missingBaseFields),
    [gate.missingBaseFields],
  );

  const missingTraitSet = useMemo(
    () => new Set(gate.missingTraitTypeSlugs),
    [gate.missingTraitTypeSlugs],
  );

  const bindingBySlug = useMemo(
    () => new Map(bindings.map((binding) => [binding.traitTypeSlug, binding])),
    [bindings],
  );

  const updateTextField = useCallback(
    (key: keyof Omit<FormState, "active" | "traitSelectionsByTypeSlug">, value: string) => {
      setState((previous) => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleTraitOptionToggle = useCallback(
    (traitTypeSlug: string, optionSlug: string, checked: boolean) => {
      const binding = bindingBySlug.get(traitTypeSlug);

      if (!binding || !canEdit) {
        return;
      }

      setState((previous) => {
        const nextSelections = { ...previous.traitSelectionsByTypeSlug };
        const current = nextSelections[traitTypeSlug] ?? [];

        if (binding.selectMode === "single") {
          nextSelections[traitTypeSlug] = checked ? [optionSlug] : [];
          return {
            ...previous,
            traitSelectionsByTypeSlug: nextSelections,
          };
        }

        const set = new Set(current);

        if (checked) {
          set.add(optionSlug);
        } else {
          set.delete(optionSlug);
        }

        nextSelections[traitTypeSlug] = Array.from(set);

        return {
          ...previous,
          traitSelectionsByTypeSlug: nextSelections,
        };
      });
    },
    [bindingBySlug, canEdit],
  );

  const handleSelectAllForTrait = useCallback(
    (traitTypeSlug: string) => {
      const binding = bindingBySlug.get(traitTypeSlug);

      if (!binding || binding.selectMode !== "multi" || !canEdit) {
        return;
      }

      const allSelectable = binding.options
        .filter((option) => !option.isDeprecated)
        .map((option) => option.slug);

      setState((previous) => ({
        ...previous,
        traitSelectionsByTypeSlug: {
          ...previous.traitSelectionsByTypeSlug,
          [traitTypeSlug]: allSelectable,
        },
      }));
    },
    [bindingBySlug, canEdit],
  );

  const handleDeselectAllForTrait = useCallback(
    (traitTypeSlug: string) => {
      const binding = bindingBySlug.get(traitTypeSlug);

      if (!binding || binding.selectMode !== "multi" || !canEdit) {
        return;
      }

      setState((previous) => ({
        ...previous,
        traitSelectionsByTypeSlug: {
          ...previous.traitSelectionsByTypeSlug,
          [traitTypeSlug]: [],
        },
      }));
    },
    [bindingBySlug, canEdit],
  );

  const jumpToBaseField = useCallback((field: string) => {
    const elementId = BASE_FIELD_INPUT_IDS[field];

    if (!elementId) {
      return;
    }

    const element = document.getElementById(elementId);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus();
  }, []);

  const jumpToTrait = useCallback((traitTypeSlug: string) => {
    const element = document.getElementById(`trait-group-${traitTypeSlug}`);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (!canEdit || !isDirty) {
        event.preventDefault();
      }
    },
    [canEdit, isDirty],
  );

  const isFieldMissing = (fieldKey: string) => missingBaseFieldSet.has(fieldKey);

  return (
    <form action={action} className="space-y-6" onSubmit={handleSubmit}>
      <input type="hidden" name="draft_id" value={draft.id} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded border border-zinc-300 bg-white p-4">
          <h3 className="text-lg font-semibold">Base Fields</h3>

          <label className="block text-sm" htmlFor="draft-title">
            <span
              className={`mb-1 block font-medium ${
                isFieldMissing("title") ? "text-red-700" : ""
              }`}
            >
              Title
            </span>
            <input
              id="draft-title"
              name="title"
              value={state.title}
              onChange={(event) => updateTextField("title", event.target.value)}
              className={getFieldClassName(isFieldMissing("title"))}
              disabled={!canEdit}
            />
          </label>

          <label className="block text-sm" htmlFor="draft-reason-snippet">
            <span
              className={`mb-1 block font-medium ${
                isFieldMissing("reason_snippet") ? "text-red-700" : ""
              }`}
            >
              Reason snippet
            </span>
            <textarea
              id="draft-reason-snippet"
              name="reason_snippet"
              value={state.reasonSnippet}
              onChange={(event) =>
                updateTextField("reasonSnippet", event.target.value)
              }
              className={getTextAreaClassName(
                isFieldMissing("reason_snippet"),
                "min-h-20",
              )}
              disabled={!canEdit}
            />
          </label>

          <label className="block text-sm" htmlFor="draft-description">
            <span
              className={`mb-1 block font-medium ${
                isFieldMissing("description") ? "text-red-700" : ""
              }`}
            >
              Description
            </span>
            <textarea
              id="draft-description"
              name="description"
              value={state.description}
              onChange={(event) =>
                updateTextField("description", event.target.value)
              }
              className={getTextAreaClassName(
                isFieldMissing("description"),
                "min-h-32",
              )}
              disabled={!canEdit}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm" htmlFor="draft-min-minutes">
              <span
                className={`mb-1 block font-medium ${
                  isFieldMissing("min_minutes") || isFieldMissing("minutes_range")
                    ? "text-red-700"
                    : ""
                }`}
              >
                Min minutes
              </span>
              <input
                id="draft-min-minutes"
                type="number"
                name="min_minutes"
                value={state.minMinutes}
                onChange={(event) =>
                  updateTextField("minMinutes", event.target.value)
                }
                className={getFieldClassName(
                  isFieldMissing("min_minutes") || isFieldMissing("minutes_range"),
                )}
                disabled={!canEdit}
              />
            </label>

            <label className="block text-sm" htmlFor="draft-max-minutes">
              <span
                className={`mb-1 block font-medium ${
                  isFieldMissing("max_minutes") || isFieldMissing("minutes_range")
                    ? "text-red-700"
                    : ""
                }`}
              >
                Max minutes
              </span>
              <input
                id="draft-max-minutes"
                type="number"
                name="max_minutes"
                value={state.maxMinutes}
                onChange={(event) =>
                  updateTextField("maxMinutes", event.target.value)
                }
                className={getFieldClassName(
                  isFieldMissing("max_minutes") || isFieldMissing("minutes_range"),
                )}
                disabled={!canEdit}
              />
            </label>
          </div>

          <label className="block text-sm" htmlFor="draft-steps">
            <span className="mb-1 block font-medium">Steps</span>
            <textarea
              id="draft-steps"
              name="steps"
              value={state.steps}
              onChange={(event) => updateTextField("steps", event.target.value)}
              className={getTextAreaClassName(false, "min-h-20")}
              disabled={!canEdit}
            />
          </label>

          <label className="block text-sm" htmlFor="draft-what-you-need">
            <span className="mb-1 block font-medium">What you need</span>
            <textarea
              id="draft-what-you-need"
              name="what_you_need"
              value={state.whatYouNeed}
              onChange={(event) =>
                updateTextField("whatYouNeed", event.target.value)
              }
              className={getTextAreaClassName(false, "min-h-16")}
              disabled={!canEdit}
            />
          </label>

          <label className="block text-sm" htmlFor="draft-tips-or-variations">
            <span className="mb-1 block font-medium">Tips / variations</span>
            <textarea
              id="draft-tips-or-variations"
              name="tips_or_variations"
              value={state.tipsOrVariations}
              onChange={(event) =>
                updateTextField("tipsOrVariations", event.target.value)
              }
              className={getTextAreaClassName(false, "min-h-16")}
              disabled={!canEdit}
            />
          </label>

          <label className="block text-sm" htmlFor="draft-safety-note">
            <span className="mb-1 block font-medium">Safety / boundaries note</span>
            <textarea
              id="draft-safety-note"
              name="safety_or_boundaries_note"
              value={state.safetyOrBoundariesNote}
              onChange={(event) =>
                updateTextField("safetyOrBoundariesNote", event.target.value)
              }
              className={getTextAreaClassName(false, "min-h-16")}
              disabled={!canEdit}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm" htmlFor="draft-source-url">
              <span className="mb-1 block font-medium">Source URL</span>
              <input
                id="draft-source-url"
                name="source_url"
                value={state.sourceUrl}
                onChange={(event) => updateTextField("sourceUrl", event.target.value)}
                className={getFieldClassName(false)}
                disabled={!canEdit}
              />
            </label>

            <label className="block text-sm" htmlFor="draft-editorial-note">
              <span className="mb-1 block font-medium">Editorial note</span>
              <input
                id="draft-editorial-note"
                name="editorial_note"
                value={state.editorialNote}
                onChange={(event) =>
                  updateTextField("editorialNote", event.target.value)
                }
                className={getFieldClassName(false)}
                disabled={!canEdit}
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              checked={state.active}
              onChange={(event) =>
                setState((previous) => ({
                  ...previous,
                  active: event.target.checked,
                }))
              }
              disabled={!canEdit}
            />
            Active
          </label>
        </section>

        <div className="space-y-4">
          <PublishGatePanel
            gate={gate}
            baseFieldLabels={BASE_FIELD_LABELS}
            traitLabelsBySlug={traitLabelMap}
            onJumpToBaseField={jumpToBaseField}
            onJumpToTrait={jumpToTrait}
          />

          <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
            <h3 className="font-semibold">Status</h3>
            {canEdit ? (
              <label className="mt-3 block">
                <span className="mb-1 block font-medium">Next status</span>
                <select
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                  name="next_status"
                  value={state.nextStatus}
                  onChange={(event) =>
                    setState((previous) => ({
                      ...previous,
                      nextStatus: event.target.value,
                    }))
                  }
                >
                  {transitionOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-2">Current status: {draft.status}</p>
            )}

            <p className="mt-3 text-xs text-zinc-500">
              Only editors/admins can save changes. Setting `publishable` requires gate pass.
            </p>
            {canEdit && (
              <p className="mt-2 text-xs text-zinc-500">
                {isDirty ? "Unsaved changes" : "No unsaved changes"}
              </p>
            )}
          </section>

          <SaveButton canEdit={canEdit} isDirty={isDirty} />
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Trait Tagging</h3>
        {TIERS.map((tier) => {
          const tierBindings = bindings.filter((binding) => binding.tier === tier);

          if (tierBindings.length === 0) {
            return null;
          }

          return (
            <div key={tier} className="space-y-3">
              <h4 className="text-base font-semibold">Tier {tier}</h4>
              <div className="grid gap-3">
                {tierBindings.map((binding) => (
                  <TraitPicker
                    key={binding.id}
                    binding={binding}
                    selectedSlugs={
                      normalizedCurrentTraitSelections[binding.traitTypeSlug] ?? []
                    }
                    disabled={!canEdit}
                    isMissingRequired={missingTraitSet.has(binding.traitTypeSlug)}
                    onSelectOption={handleTraitOptionToggle}
                    onSelectAll={handleSelectAllForTrait}
                    onDeselectAll={handleDeselectAllForTrait}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </form>
  );
}
