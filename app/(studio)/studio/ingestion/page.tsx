import Link from "next/link";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  INGEST_CANDIDATE_STATUSES,
  listIngestionCandidates,
  listIngestionSourceKeys,
  type IngestCandidateStatus,
} from "@/lib/studio/ingestion";

type IngestionPageProps = {
  searchParams?: Promise<{ status?: string; source?: string; q?: string }>;
};

const STATUS_OPTIONS: Array<{ label: string; value: IngestCandidateStatus }> = [
  { label: "New", value: "new" },
  { label: "Normalized", value: "normalized" },
  { label: "Curated", value: "curated" },
  { label: "Pushed to Studio", value: "pushed_to_studio" },
  { label: "Exported", value: "exported" },
  { label: "Rejected", value: "rejected" },
];

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

export default async function StudioIngestionPage({ searchParams }: IngestionPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const params = (await searchParams) ?? {};

  const rawStatus = (params.status ?? "").trim();
  const status: IngestCandidateStatus | "all" =
    rawStatus && INGEST_CANDIDATE_STATUSES.includes(rawStatus as IngestCandidateStatus)
      ? (rawStatus as IngestCandidateStatus)
      : "curated";
  const source = (params.source ?? "").trim();
  const query = (params.q ?? "").trim();

  const [candidates, sourceKeys] = await Promise.all([
    listIngestionCandidates({
      status,
      sourceKey: source || undefined,
      query: query || undefined,
      limit: 200,
    }),
    listIngestionSourceKeys(),
  ]);

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Ingestion Inbox</h2>
          <p className="text-sm text-zinc-600">
            Review scraped candidates and promote only the rows that are editorially clean.
          </p>
          <p className="text-xs text-zinc-500">
            Default filter is <span className="font-medium">Curated</span>; switch to{" "}
            <span className="font-medium">All statuses</span> to inspect machine-filtered rows.
          </p>
        </div>

        <form className="grid gap-3 rounded border border-zinc-300 bg-white p-4 md:grid-cols-4">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Search</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="title, description, source url"
              className="w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Source</span>
            <select
              name="source"
              defaultValue={source}
              className="w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="">All sources</option>
              {sourceKeys.map((sourceKey) => (
                <option key={sourceKey} value={sourceKey}>
                  {sourceKey}
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

        <p className="text-sm text-zinc-600">Showing {candidates.length} candidates.</p>

        <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-zinc-100 text-left">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2">Title</th>
                <th className="border-b border-zinc-200 px-3 py-2">Source</th>
                <th className="border-b border-zinc-200 px-3 py-2">Status</th>
                <th className="border-b border-zinc-200 px-3 py-2">Updated</th>
                <th className="border-b border-zinc-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={5}>
                    No candidates found.
                  </td>
                </tr>
              )}
              {candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td className="border-b border-zinc-100 px-3 py-2">
                    <div className="space-y-1">
                      <p>{candidate.title}</p>
                      {candidate.description && (
                        <p className="line-clamp-2 text-xs text-zinc-600">
                          {candidate.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2">{candidate.sourceKey}</td>
                  <td className="border-b border-zinc-100 px-3 py-2">{candidate.status}</td>
                  <td className="border-b border-zinc-100 px-3 py-2">
                    {formatDateTime(candidate.updatedAt)}
                  </td>
                  <td className="border-b border-zinc-100 px-3 py-2 text-right">
                    <Link
                      href={`/studio/ingestion/${candidate.id}`}
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
      </section>
    </StudioShell>
  );
}
