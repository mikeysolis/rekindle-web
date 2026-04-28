import Link from "next/link";

import type { CatalogImportBatch } from "@/lib/studio/catalog-intake";

type BatchTableProps = {
  batches: CatalogImportBatch[];
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function BatchTable({ batches }: BatchTableProps) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-zinc-100 text-left">
          <tr>
            <th className="border-b border-zinc-200 px-3 py-2">Batch</th>
            <th className="border-b border-zinc-200 px-3 py-2">Family</th>
            <th className="border-b border-zinc-200 px-3 py-2">Rows</th>
            <th className="border-b border-zinc-200 px-3 py-2">Clusters</th>
            <th className="border-b border-zinc-200 px-3 py-2">Pending</th>
            <th className="border-b border-zinc-200 px-3 py-2">Ready</th>
            <th className="border-b border-zinc-200 px-3 py-2">Promoted</th>
            <th className="border-b border-zinc-200 px-3 py-2">Rejected</th>
            <th className="border-b border-zinc-200 px-3 py-2">Updated</th>
            <th className="border-b border-zinc-200 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {batches.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-zinc-500" colSpan={10}>
                No catalog import batches found.
              </td>
            </tr>
          )}
          {batches.map((batch) => (
            <tr key={batch.batchId}>
              <td className="border-b border-zinc-100 px-3 py-2">
                <div>
                  <p className="font-medium">{batch.batchCode}</p>
                  <p className="text-xs text-zinc-500">
                    {batch.version ?? "no version"}
                    {batch.segment ? ` • ${batch.segment}` : ""}
                  </p>
                </div>
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.family}</td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.rowCount}</td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.clusterCount}</td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.pendingCount}</td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {batch.readyForDraftCount}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.promotedCount}</td>
              <td className="border-b border-zinc-100 px-3 py-2">{batch.rejectedCount}</td>
              <td className="border-b border-zinc-100 px-3 py-2">
                {formatDateTime(batch.updatedAt)}
              </td>
              <td className="border-b border-zinc-100 px-3 py-2 text-right">
                <Link
                  href={`/studio/catalog-intake/${batch.batchId}`}
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
