import type { IdeaTraitBinding } from "@/lib/studio/registry-types";

type TraitPickerProps = {
  binding: IdeaTraitBinding;
  selectedSlugs: string[];
  disabled?: boolean;
  isMissingRequired?: boolean;
  onSelectOption: (
    traitTypeSlug: string,
    optionSlug: string,
    checked: boolean,
  ) => void;
  onSelectAll: (traitTypeSlug: string) => void;
  onDeselectAll: (traitTypeSlug: string) => void;
};

export default function TraitPicker({
  binding,
  selectedSlugs,
  disabled = false,
  isMissingRequired = false,
  onSelectOption,
  onSelectAll,
  onDeselectAll,
}: TraitPickerProps) {
  const inputType = binding.selectMode === "single" ? "radio" : "checkbox";
  const minLabel =
    binding.selectMode === "multi" ? ` (min ${binding.minRequired})` : "";
  const canBulkToggle = binding.selectMode === "multi" && !disabled;
  const selectedCountLabel =
    binding.selectMode === "multi"
      ? `${selectedSlugs.length} selected`
      : `${selectedSlugs.length > 0 ? 1 : 0} selected`;

  return (
    <fieldset
      id={`trait-group-${binding.traitTypeSlug}`}
      className={`rounded border bg-white p-4 ${
        isMissingRequired
          ? "border-red-300 bg-red-50/40"
          : "border-zinc-300"
      }`}
    >
      <legend className="px-1 text-sm font-semibold">
        {binding.traitTypeLabel} ({binding.traitTypeSlug})
      </legend>
      <p
        className={`mb-3 text-xs ${
          isMissingRequired ? "text-red-700" : "text-zinc-600"
        }`}
      >
        Tier {binding.tier} • {binding.selectMode}
        {binding.isRequired ? " • required" : " • optional"}
        {binding.isRequired ? minLabel : ""}
        {" • "}
        {selectedCountLabel}
      </p>
      {canBulkToggle && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSelectAll(binding.traitTypeSlug)}
            className="rounded border border-zinc-300 px-2 py-1 hover:border-zinc-600"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onDeselectAll(binding.traitTypeSlug)}
            className="rounded border border-zinc-300 px-2 py-1 hover:border-zinc-600"
          >
            Deselect all
          </button>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {binding.options.map((option) => {
          const optionId = `${binding.traitTypeSlug}-${option.slug}`;
          const isChecked = selectedSlugs.includes(option.slug);

          return (
            <label
              className={`flex items-start gap-2 rounded border px-3 py-2 text-sm ${
                option.isDeprecated
                  ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                  : "border-zinc-200 bg-zinc-50"
              }`}
              key={option.id}
              htmlFor={optionId}
            >
              <input
                id={optionId}
                type={inputType}
                name={`trait:${binding.traitTypeSlug}`}
                value={option.slug}
                checked={isChecked}
                onChange={(event) =>
                  onSelectOption(
                    binding.traitTypeSlug,
                    option.slug,
                    event.currentTarget.checked,
                  )
                }
                disabled={option.isDeprecated || disabled}
              />
              <span>
                {option.label}
                <span className="ml-1 text-xs text-zinc-500">({option.slug})</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
