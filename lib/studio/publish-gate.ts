import type { IdeaTraitBinding } from "@/lib/studio/registry-types";

export type TraitSelectionsByTypeSlug = Record<string, string[]>;

export type PublishGateInput = {
  title: string | null;
  reasonSnippet: string | null;
  description: string | null;
  minMinutes: number | null;
  maxMinutes: number | null;
  traitSelectionsByTypeSlug: TraitSelectionsByTypeSlug;
  bindings: IdeaTraitBinding[];
};

export type PublishGateResult = {
  isPublishable: boolean;
  missingBaseFields: string[];
  missingTraitTypeSlugs: string[];
  warnings: string[];
};

function isNonEmpty(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function evaluatePublishGate(input: PublishGateInput): PublishGateResult {
  const missingBaseFields: string[] = [];

  if (!isNonEmpty(input.title)) {
    missingBaseFields.push("title");
  }

  if (!isNonEmpty(input.reasonSnippet)) {
    missingBaseFields.push("reason_snippet");
  }

  if (!isNonEmpty(input.description)) {
    missingBaseFields.push("description");
  }

  if (input.minMinutes === null || Number.isNaN(input.minMinutes)) {
    missingBaseFields.push("min_minutes");
  }

  if (input.maxMinutes === null || Number.isNaN(input.maxMinutes)) {
    missingBaseFields.push("max_minutes");
  }

  const warnings: string[] = [];

  if (
    input.minMinutes !== null &&
    input.maxMinutes !== null &&
    input.minMinutes > input.maxMinutes
  ) {
    missingBaseFields.push("minutes_range");
    warnings.push("min_minutes must be less than or equal to max_minutes.");
  }

  const missingTraitTypeSlugs: string[] = [];

  const requiredTierOneBindings = input.bindings.filter(
    (binding) => binding.tier === 1 && binding.isRequired,
  );

  for (const binding of requiredTierOneBindings) {
    const selected = input.traitSelectionsByTypeSlug[binding.traitTypeSlug] ?? [];

    if (binding.selectMode === "single") {
      if (selected.length < 1) {
        missingTraitTypeSlugs.push(binding.traitTypeSlug);
      }
      continue;
    }

    if (selected.length < binding.minRequired) {
      missingTraitTypeSlugs.push(binding.traitTypeSlug);
    }
  }

  return {
    isPublishable:
      missingBaseFields.length === 0 && missingTraitTypeSlugs.length === 0,
    missingBaseFields,
    missingTraitTypeSlugs,
    warnings,
  };
}
