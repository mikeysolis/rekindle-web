import StudioShell from "@/components/studio/StudioShell";
import BatchTable from "@/components/studio/catalog-intake/BatchTable";
import { requireStudioUser } from "@/lib/studio/auth";
import { listCatalogImportBatches } from "@/lib/studio/catalog-intake";

export default async function StudioCatalogIntakePage() {
  const studioUser = await requireStudioUser("viewer");
  const batches = await listCatalogImportBatches();

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Catalog Intake</h2>
          <p className="text-sm text-zinc-600">
            Review generated catalog batches, inspect clustered concepts, and promote preferred
            candidates into Studio drafts.
          </p>
        </div>

        <div className="rounded border border-zinc-300 bg-white p-4 text-sm">
          <p>Total batches: {batches.length}</p>
          <p>
            Total candidates: {batches.reduce((sum, batch) => sum + batch.candidateCount, 0)}
          </p>
          <p>
            Total promoted candidates: {batches.reduce((sum, batch) => sum + batch.promotedCount, 0)}
          </p>
        </div>

        <BatchTable batches={batches} />
      </section>
    </StudioShell>
  );
}
