import { createSupabaseServerClient } from "@/lib/database/server";
import type {
  IdeaRegistrySnapshot,
  IdeaTraitBinding,
  RegistryTraitOption,
  RegistryTraitType,
  TraitSelectMode,
} from "@/lib/studio/registry-types";

export type {
  IdeaRegistrySnapshot,
  IdeaTraitBinding,
  RegistryTraitOption,
  RegistryTraitType,
  TraitSelectMode,
} from "@/lib/studio/registry-types";

type RawTraitTypeRow = {
  id: string;
  slug: string;
  name?: string | null;
  sort_order?: number | null;
};

type RawTraitOptionRow = {
  id: string;
  trait_type_id: string;
  slug: string;
  label?: string | null;
  sort_order?: number | null;
  is_deprecated?: boolean | null;
};

type RawTraitBindingRow = {
  id: string;
  context: string;
  trait_type_id: string;
  tier?: number | string | null;
  select_mode?: string | null;
  is_required?: boolean | null;
  min_required?: number | null;
  ui_group_slug?: string | null;
  ui_hint?: string | null;
  quick_filter_order?: number | null;
};

function normalizeTier(value: unknown): 1 | 2 | 3 {
  const numeric = Number(value);

  if (numeric === 2 || numeric === 3) {
    return numeric;
  }

  return 1;
}

function normalizeSelectMode(value: unknown): TraitSelectMode {
  return value === "multi" ? "multi" : "single";
}

function compareSortOrder(
  a: number | null,
  b: number | null,
  fallbackA: string,
  fallbackB: string,
): number {
  if (a === null && b === null) {
    return fallbackA.localeCompare(fallbackB);
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  if (a === b) {
    return fallbackA.localeCompare(fallbackB);
  }

  return a - b;
}

async function getTraitTypeRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<RawTraitTypeRow[]> {
  const withNameAndSort = await supabase
    .from("trait_types")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (!withNameAndSort.error) {
    return (withNameAndSort.data ?? []) as RawTraitTypeRow[];
  }

  const withName = await supabase
    .from("trait_types")
    .select("id, slug, name")
    .order("slug", { ascending: true });

  if (!withName.error) {
    return (withName.data ?? []) as RawTraitTypeRow[];
  }

  const withoutSort = await supabase
    .from("trait_types")
    .select("id, slug")
    .order("slug", { ascending: true });

  if (withoutSort.error) {
    throw new Error(`Failed to load trait types: ${withoutSort.error.message}`);
  }

  return (withoutSort.data ?? []) as RawTraitTypeRow[];
}

async function getTraitOptionRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  traitTypeIds: string[],
): Promise<RawTraitOptionRow[]> {
  const withSortAndFlags = await supabase
    .from("trait_options")
    .select("id, trait_type_id, slug, label, sort_order, is_deprecated")
    .in("trait_type_id", traitTypeIds)
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (!withSortAndFlags.error) {
    return (withSortAndFlags.data ?? []) as RawTraitOptionRow[];
  }

  const withLabelAndFlags = await supabase
    .from("trait_options")
    .select("id, trait_type_id, slug, label, is_deprecated")
    .in("trait_type_id", traitTypeIds)
    .order("slug", { ascending: true });

  if (!withLabelAndFlags.error) {
    return (withLabelAndFlags.data ?? []) as RawTraitOptionRow[];
  }

  const minimal = await supabase
    .from("trait_options")
    .select("id, trait_type_id, slug")
    .in("trait_type_id", traitTypeIds)
    .order("slug", { ascending: true });

  if (minimal.error) {
    throw new Error(`Failed to load trait options: ${minimal.error.message}`);
  }

  return (minimal.data ?? []) as RawTraitOptionRow[];
}

async function getIdeaBindingRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<RawTraitBindingRow[]> {
  const withQuickOrder = await supabase
    .from("trait_bindings")
    .select(
      "id, context, trait_type_id, tier, select_mode, is_required, min_required, ui_group_slug, ui_hint, quick_filter_order",
    )
    .eq("context", "idea");

  if (!withQuickOrder.error) {
    return (withQuickOrder.data ?? []) as RawTraitBindingRow[];
  }

  const withoutQuickOrder = await supabase
    .from("trait_bindings")
    .select(
      "id, context, trait_type_id, tier, select_mode, is_required, min_required, ui_group_slug, ui_hint",
    )
    .eq("context", "idea");

  if (withoutQuickOrder.error) {
    throw new Error(
      `Failed to load trait bindings: ${withoutQuickOrder.error.message}`,
    );
  }

  return (withoutQuickOrder.data ?? []) as RawTraitBindingRow[];
}

export async function getIdeaRegistrySnapshot(): Promise<IdeaRegistrySnapshot> {
  const supabase = await createSupabaseServerClient();
  const traitTypeRows = await getTraitTypeRows(supabase);

  const traitTypes: RegistryTraitType[] = traitTypeRows.map(
    (row: RawTraitTypeRow) => ({
      id: row.id,
      slug: row.slug,
      label: (row.name ?? row.slug).trim(),
      sortOrder: row.sort_order ?? null,
    }),
  );

  const traitTypeById = new Map(traitTypes.map((type) => [type.id, type]));

  const bindingRows = await getIdeaBindingRows(supabase);
  const boundTraitTypeIds = Array.from(
    new Set(bindingRows.map((row) => row.trait_type_id)),
  );

  let optionsByTypeId = new Map<string, RegistryTraitOption[]>();

  if (boundTraitTypeIds.length > 0) {
    const rawOptionRows = await getTraitOptionRows(supabase, boundTraitTypeIds);

    optionsByTypeId = new Map<string, RegistryTraitOption[]>();

    for (const row of rawOptionRows) {
      const option: RegistryTraitOption = {
        id: row.id,
        traitTypeId: row.trait_type_id,
        slug: row.slug,
        label: (row.label ?? row.slug).trim(),
        sortOrder: row.sort_order ?? null,
        isDeprecated: Boolean(row.is_deprecated),
      };

      const existing = optionsByTypeId.get(option.traitTypeId) ?? [];
      existing.push(option);
      optionsByTypeId.set(option.traitTypeId, existing);
    }

    for (const options of optionsByTypeId.values()) {
      options.sort((a, b) =>
        compareSortOrder(a.sortOrder, b.sortOrder, a.slug, b.slug),
      );
    }
  }

  const bindings: IdeaTraitBinding[] = [];

  for (const row of bindingRows) {
    const traitType = traitTypeById.get(row.trait_type_id);

    if (!traitType) {
      continue;
    }

    const selectMode = normalizeSelectMode(row.select_mode);

    bindings.push({
      id: row.id,
      context: row.context,
      traitTypeId: row.trait_type_id,
      traitTypeSlug: traitType.slug,
      traitTypeLabel: traitType.label,
      tier: normalizeTier(row.tier),
      selectMode,
      isRequired: Boolean(row.is_required),
      minRequired: Math.max(1, row.min_required ?? 1),
      uiGroupSlug: row.ui_group_slug ?? null,
      uiHint: row.ui_hint ?? null,
      sortOrder: row.quick_filter_order ?? null,
      options: optionsByTypeId.get(row.trait_type_id) ?? [],
    });
  }

  bindings.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    return compareSortOrder(
      a.sortOrder,
      b.sortOrder,
      a.traitTypeSlug,
      b.traitTypeSlug,
    );
  });

  return {
    traitTypes,
    bindings,
  };
}

export function getTierOneRequiredBindings(
  bindings: IdeaTraitBinding[],
): IdeaTraitBinding[] {
  return bindings.filter((binding) => binding.tier === 1 && binding.isRequired);
}
