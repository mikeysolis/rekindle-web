import StudioShell from "@/components/studio/StudioShell";
import RegistryTable from "@/components/studio/RegistryTable";
import { requireStudioUser } from "@/lib/studio/auth";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";

type RegistryPageProps = {
  searchParams?: Promise<{ q?: string; tier?: string; trait?: string }>;
};

export default async function StudioRegistryPage({
  searchParams,
}: RegistryPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim().toLowerCase();
  const tierFilter = Number.parseInt(params.tier ?? "", 10);
  const traitFilter = (params.trait ?? "").trim();

  const snapshot = await getIdeaRegistrySnapshot();

  const bindings = snapshot.bindings.filter((binding) => {
    if (Number.isFinite(tierFilter) && binding.tier !== tierFilter) {
      return false;
    }

    if (traitFilter && binding.traitTypeSlug !== traitFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    if (
      binding.traitTypeSlug.toLowerCase().includes(query) ||
      binding.traitTypeLabel.toLowerCase().includes(query)
    ) {
      return true;
    }

    return binding.options.some(
      (option) =>
        option.slug.toLowerCase().includes(query) ||
        option.label.toLowerCase().includes(query),
    );
  });

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Registry</h2>
        <p className="text-sm text-zinc-600">
          Read-only view of trait bindings and available options for `context=idea`.
        </p>

        <form className="grid gap-3 rounded border border-zinc-300 bg-white p-4 md:grid-cols-4">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Search</span>
            <input
              className="w-full rounded border border-zinc-300 px-3 py-2"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="trait or option slug"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Tier</span>
            <select
              className="w-full rounded border border-zinc-300 px-3 py-2"
              name="tier"
              defaultValue={params.tier ?? ""}
            >
              <option value="">All tiers</option>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Trait type</span>
            <select
              className="w-full rounded border border-zinc-300 px-3 py-2"
              name="trait"
              defaultValue={params.trait ?? ""}
            >
              <option value="">All trait types</option>
              {snapshot.traitTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.slug}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-600"
            >
              Apply filters
            </button>
          </div>
        </form>

        <p className="text-sm text-zinc-600">
          Showing {bindings.length} of {snapshot.bindings.length} idea bindings.
        </p>

        <RegistryTable bindings={bindings} />
      </section>
    </StudioShell>
  );
}
