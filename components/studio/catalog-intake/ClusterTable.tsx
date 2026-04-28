import Link from "next/link";

import type { CatalogImportBatchCluster } from "@/lib/studio/catalog-intake";

type ClusterTableProps = {
  batchId: string;
  clusters: CatalogImportBatchCluster[];
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ClusterTable({ batchId, clusters }: ClusterTableProps) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-zinc-100 text-left">
          <tr>
            <th className="border-b border-zinc-200 px-3 py-2">Canonical title</th>
            <th className="border-b border-zinc-200 px-3 py-2">Status</th>
            <th className="border-b border-zinc-200 px-3 py-2">Preferred</th>
            <th className="border-b border-zinc-200 px-3 py-2">Batch count</th>
            <th className="border-b border-zinc-200 px-3 py-2">Total count</th>
            <th className="border-b border-zinc-200 px-3 py-2">Draft</th>
            <th className="border-b border-zinc-200 px-3 py-2">Updated</th>
            <th className="border-b border-zinc-200 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {clusters.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-zinc-500" colSpan={8}>
                No clusters found for this batch.
              </td>
            </tr>
          )}
          {clusters.map((cluster) => (
            <tr key={cluster.clusterId}>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.canonicalTitle ?? "(Untitled cluster)"}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.reviewStatus}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.preferredTitle ?? "-"}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.batchCandidateCount}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.totalCandidateCount}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {cluster.promotedDraftId ? "linked" : "-"}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {formatDateTime(cluster.updatedAt)}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2 text-right">
                <Link
                  href={`/studio/catalog-intake/clusters/${cluster.clusterId}?fromBatch=${batchId}`}
                  className="rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-600"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
