import type { IdeaTraitBinding } from "@/lib/studio/registry-types";

type RegistryTableProps = {
  bindings: IdeaTraitBinding[];
};

export default function RegistryTable({ bindings }: RegistryTableProps) {
  if (bindings.length === 0) {
    return (
      <div className="rounded border border-zinc-300 bg-white p-4 text-sm text-zinc-600">
        No bindings found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-zinc-100 text-left">
          <tr>
            <th className="border-b border-zinc-200 px-3 py-2">Trait Type</th>
            <th className="border-b border-zinc-200 px-3 py-2">Tier</th>
            <th className="border-b border-zinc-200 px-3 py-2">Mode</th>
            <th className="border-b border-zinc-200 px-3 py-2">Required</th>
            <th className="border-b border-zinc-200 px-3 py-2">Options</th>
          </tr>
        </thead>
        <tbody>
          {bindings.map((binding) => (
            <tr key={binding.id} className="align-top">
              <td className="border-b border-zinc-100 px-3 py-2">
                <p className="font-medium">{binding.traitTypeLabel}</p>
                <p className="text-xs text-zinc-500">{binding.traitTypeSlug}</p>
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">{binding.tier}</td>
              <td className="border-b border-zinc-100 px-3 py-2">{binding.selectMode}</td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {binding.isRequired ? `yes (min ${binding.minRequired})` : "no"}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {binding.options.map((option) => (
                    <span
                      key={option.id}
                      className={`rounded px-2 py-0.5 text-xs ${
                        option.isDeprecated
                          ? "bg-zinc-200 text-zinc-500"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      {option.slug}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
