import Link from "next/link";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  listDrafts,
  listDraftsByStatus,
  parseDraftStatus,
  type DraftStatus,
} from "@/lib/studio/drafts";
import { evaluatePublishGate } from "@/lib/studio/publish-gate";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";
import { getTraitSelectionsForDraftIds } from "@/lib/studio/drafts";

type DraftsPageProps = {
  searchParams?: Promise<{ status?: string }>;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

const statusFilterOptions: Array<{ label: string; value: DraftStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Publishable", value: "publishable" },
  { label: "Exported", value: "exported" },
];

export default async function StudioDraftsPage({ searchParams }: DraftsPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const params = (await searchParams) ?? {};
  const rawStatus = params.status ?? "";

  const statusFilter =
    rawStatus && statusFilterOptions.some((option) => option.value === rawStatus)
      ? parseDraftStatus(rawStatus)
      : null;

  const [snapshot, drafts] = await Promise.all([
    getIdeaRegistrySnapshot(),
    statusFilter ? listDraftsByStatus(statusFilter) : listDrafts(),
  ]);

  const draftIds = drafts.map((draft) => draft.id);
  const traitSelectionsByDraftId = await getTraitSelectionsForDraftIds(draftIds);

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Drafts</h2>
            <p className="text-sm text-zinc-600">
              Draft idea catalog entries with publish-gate readiness.
            </p>
          </div>
          {hasStudioRoleAtLeast(studioUser.role, "editor") && (
            <Link
              href="/studio/drafts/new"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              New draft
            </Link>
          )}
        </div>

        <form className="flex items-end gap-3 rounded border border-zinc-300 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Status</span>
            <select
              name="status"
              className="rounded border border-zinc-300 px-3 py-2"
              defaultValue={statusFilter ?? ""}
            >
              <option value="">All statuses</option>
              {statusFilterOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-600"
          >
            Apply
          </button>
        </form>

        <div className="overflow-x-auto rounded border border-zinc-300 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-zinc-100 text-left">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2">Title</th>
                <th className="border-b border-zinc-200 px-3 py-2">Status</th>
                <th className="border-b border-zinc-200 px-3 py-2">Gate</th>
                <th className="border-b border-zinc-200 px-3 py-2">Updated</th>
                <th className="border-b border-zinc-200 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-zinc-500"
                    colSpan={5}
                  >
                    No drafts found.
                  </td>
                </tr>
              )}
              {drafts.map((draft) => {
                const gate = evaluatePublishGate({
                  title: draft.title,
                  reasonSnippet: draft.reasonSnippet,
                  description: draft.description,
                  minMinutes: draft.minMinutes,
                  maxMinutes: draft.maxMinutes,
                  traitSelectionsByTypeSlug:
                    traitSelectionsByDraftId[draft.id] ?? {},
                  bindings: snapshot.bindings,
                });

                return (
                  <tr key={draft.id}>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      {draft.title ?? "(Untitled draft)"}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">{draft.status}</td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      <span
                        className={
                          gate.isPublishable
                            ? "rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                            : "rounded bg-amber-100 px-2 py-1 text-xs text-amber-700"
                        }
                      >
                        {gate.isPublishable ? "publishable" : "missing requirements"}
                      </span>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      {formatDateTime(draft.updatedAt)}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-right">
                      <Link
                        href={`/studio/drafts/${draft.id}`}
                        className="rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-600"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </StudioShell>
  );
}
