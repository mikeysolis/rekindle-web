import type { IdeaTraitBinding } from "@/lib/studio/registry";

type TraitPickerProps = {
  binding: IdeaTraitBinding;
  selectedSlugs: string[];
  disabled?: boolean;
};

export default function TraitPicker({
  binding,
  selectedSlugs,
  disabled = false,
}: TraitPickerProps) {
  const inputType = binding.selectMode === "single" ? "radio" : "checkbox";
  const minLabel =
    binding.selectMode === "multi" ? ` (min ${binding.minRequired})` : "";

  return (
    <fieldset className="rounded border border-zinc-300 bg-white p-4">
      <legend className="px-1 text-sm font-semibold">
        {binding.traitTypeLabel} ({binding.traitTypeSlug})
      </legend>
      <p className="mb-3 text-xs text-zinc-600">
        Tier {binding.tier} • {binding.selectMode}
        {binding.isRequired ? " • required" : " • optional"}
        {binding.isRequired ? minLabel : ""}
      </p>
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
                defaultChecked={isChecked}
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
