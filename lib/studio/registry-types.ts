export type TraitSelectMode = "single" | "multi";

export type RegistryTraitType = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number | null;
};

export type RegistryTraitOption = {
  id: string;
  traitTypeId: string;
  slug: string;
  label: string;
  sortOrder: number | null;
  isDeprecated: boolean;
};

export type IdeaTraitBinding = {
  id: string;
  context: string;
  traitTypeId: string;
  traitTypeSlug: string;
  traitTypeLabel: string;
  tier: 1 | 2 | 3;
  selectMode: TraitSelectMode;
  isRequired: boolean;
  minRequired: number;
  uiGroupSlug: string | null;
  uiHint: string | null;
  sortOrder: number | null;
  options: RegistryTraitOption[];
};

export type IdeaRegistrySnapshot = {
  traitTypes: RegistryTraitType[];
  bindings: IdeaTraitBinding[];
};
