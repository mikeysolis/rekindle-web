import Link from "next/link";
import { notFound } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import ClusterTable from "@/components/studio/catalog-intake/ClusterTable";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  getCatalogImportBatch,
  listCatalogImportBatchClusters,
} from "@/lib/studio/catalog-intake";

type CatalogIntakeBatchDetailPageProps = {
  params: Promise<{ batchId: string }>;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default async function StudioCatalogIntakeBatchDetailPage({
  params,
}: CatalogIntakeBatchDetailPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const { batchId } = await params;

  const [batch, clusters] = await Promise.all([
    getCatalogImportBatch(batchId),
    listCatalogImportBatchClusters(batchId),
  ]);

  if (!batch) {
    notFound();
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{batch.batchCode}</h2>
            <p className="text-sm text-zinc-600">
              {batch.family}
              {batch.version ? ` • ${batch.version}` : ""}
              {batch.segment ? ` • ${batch.segment}` : ""}
            </p>
          </div>
          <Link
            href="/studio/catalog-intake"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
          >
            Back to batches
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
            <h3 className="font-semibold">Batch summary</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <p>
                <span className="font-medium">Rows:</span> {batch.rowCount}
              </p>
              <p>
                <span className="font-medium">Candidates:</span> {batch.candidateCount}
              </p>
              <p>
                <span className="font-medium">Clusters:</span> {batch.clusterCount}
              </p>
              <p>
                <span className="font-medium">Pending:</span> {batch.pendingCount}
              </p>
              <p>
                <span className="font-medium">Ready for draft:</span> {batch.readyForDraftCount}
              </p>
              <p>
                <span className="font-medium">Promoted:</span> {batch.promotedCount}
              </p>
              <p>
                <span className="font-medium">Rejected:</span> {batch.rejectedCount}
              </p>
              <p>
                <span className="font-medium">Unclustered:</span> {batch.unclusteredCount}
              </p>
              <p>
                <span className="font-medium">Import status:</span> {batch.importStatus}
              </p>
              <p>
                <span className="font-medium">Updated:</span> {formatDateTime(batch.updatedAt)}
              </p>
            </div>
          </section>

          <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
            <h3 className="font-semibold">Source provenance</h3>
            <div className="mt-3 space-y-2 text-zinc-700">
              <p className="break-all">
                <span className="font-medium">Source path:</span> {batch.sourcePath}
              </p>
              <p className="break-all">
                <span className="font-medium">Source pool path:</span>{" "}
                {batch.sourcePoolPath ?? "-"}
              </p>
              <p>
                <span className="font-medium">Created:</span> {formatDateTime(batch.createdAt)}
              </p>
            </div>
          </section>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Clusters in this batch</h3>
          <p className="text-sm text-zinc-600">
            Open a cluster to review all related candidates across batches and promote the
            preferred concept to draft.
          </p>
        </div>

        <ClusterTable batchId={batch.batchId} clusters={clusters} />
      </section>
    </StudioShell>
  );
}
