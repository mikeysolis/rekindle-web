import Link from "next/link";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import { getTraitSelectionsForDraftIds, listDraftsByStatus } from "@/lib/studio/drafts";
import { buildExportRows } from "@/lib/studio/export";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";

export default async function StudioExportPage() {
  const studioUser = await requireStudioUser("editor");

  const [snapshot, publishableDrafts] = await Promise.all([
    getIdeaRegistrySnapshot(),
    listDraftsByStatus("publishable"),
  ]);

  const traitSelectionsByDraftId = await getTraitSelectionsForDraftIds(
    publishableDrafts.map((draft) => draft.id),
  );

  const exportBuild = buildExportRows(
    publishableDrafts,
    traitSelectionsByDraftId,
    snapshot.bindings,
  );

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Export</h2>
        <p className="text-sm text-zinc-600">
          Export publishable drafts in bulk-import CSV shape.
        </p>

        <div className="rounded border border-zinc-300 bg-white p-4 text-sm">
          <p>Total drafts with status=publishable: {publishableDrafts.length}</p>
          <p>Rows eligible for export now: {exportBuild.includedDraftIds.length}</p>
          <p>Skipped by gate re-check: {exportBuild.skippedDraftIds.length}</p>
        </div>

        <Link
          href="/studio/api/export/publishable.csv"
          className="inline-flex rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          Download publishable.csv
        </Link>
      </section>
    </StudioShell>
  );
}
