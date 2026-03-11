import Link from "next/link";
import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { isRedirectError } from "@/lib/navigation";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  createNamedStudioCheckpoint,
  dryRunNamedStudioCheckpointRestore,
  getCurrentStudioCheckpointCounts,
  listNamedStudioCheckpoints,
  restoreNamedStudioCheckpoint,
} from "@/lib/studio/checkpoint";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type StudioCheckpointPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    file?: string;
    restored?: string;
  }>;
};

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export default async function StudioCheckpointPage({
  searchParams,
}: StudioCheckpointPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const query = (await searchParams) ?? {};
  const canCreate = hasStudioRoleAtLeast(studioUser.role, "editor");
  const canPreviewRestore = hasStudioRoleAtLeast(studioUser.role, "editor");
  const canRestore = hasStudioRoleAtLeast(studioUser.role, "admin");
  const selectedFile = (query.file ?? "").trim();

  const [currentCounts, namedCheckpoints] = await Promise.all([
    getCurrentStudioCheckpointCounts(),
    listNamedStudioCheckpoints(),
  ]);
  let dryRunReport:
    | Awaited<ReturnType<typeof dryRunNamedStudioCheckpointRestore>>
    | null = null;
  let dryRunError: string | null = null;

  if (selectedFile && canPreviewRestore) {
    try {
      dryRunReport = await dryRunNamedStudioCheckpointRestore(selectedFile, {
        actorUserId: studioUser.userId,
      });
    } catch (error) {
      dryRunError =
        error instanceof Error ? error.message : "Failed to dry-run checkpoint restore.";
    }
  }

  async function createNamedCheckpointAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const rawLabel = String(formData.get("label") ?? "");

    try {
      const result = await createNamedStudioCheckpoint({
        label: rawLabel,
        actorUserId: actingUser.userId,
      });

      redirect(
        `/studio/checkpoint?created=${encodeURIComponent(result.fileName)}`,
      );
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create named checkpoint.";
      redirect(`/studio/checkpoint?error=${encodeURIComponent(message)}`);
    }
  }

  async function restoreCheckpointAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("admin");
    const fileName = String(formData.get("file_name") ?? "");

    try {
      const result = await restoreNamedStudioCheckpoint(fileName, {
        actorUserId: actingUser.userId,
      });
      redirect(
        `/studio/checkpoint?restored=${encodeURIComponent(result.fileName)}`,
      );
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Failed to restore checkpoint.";
      const params = new URLSearchParams({
        error: message,
      });

      if (fileName) {
        params.set("file", fileName);
      }

      redirect(`/studio/checkpoint?${params.toString()}`);
    }
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Checkpoint</h2>
          <p className="text-sm text-zinc-600">
            Create Git-backed named checkpoints before database resets and
            restore them through the DB-owned checkpoint contract.
          </p>
        </div>

        {query.created && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Named checkpoint created: {query.created}
          </p>
        )}

        {query.restored && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Checkpoint restored: {query.restored}
          </p>
        )}

        {query.error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-zinc-300 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Intake Count
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {currentCounts.intake_count}
            </p>
          </div>
          <div className="rounded border border-zinc-300 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Draft Count
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {currentCounts.draft_count}
            </p>
          </div>
          <div className="rounded border border-zinc-300 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Published Idea Count
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {currentCounts.published_idea_count}
            </p>
          </div>
        </div>

        <section className="rounded border border-zinc-300 bg-white p-4">
          <h3 className="text-lg font-semibold">Create Named Checkpoint</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Named checkpoint files are written under{" "}
            <code>checkpoints/studio/named</code>. Commit them to Git before you
            reset the database.
          </p>

          {canCreate ? (
            <form action={createNamedCheckpointAction} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="min-w-64 flex-1 text-sm">
                <span className="mb-1 block font-medium">Checkpoint label</span>
                <input
                  type="text"
                  name="label"
                  required
                  placeholder="before-local-reset"
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                />
              </label>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Create named checkpoint
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Editors and admins can create named checkpoints. You currently have
              read-only access.
            </p>
          )}
        </section>

        <section className="rounded border border-zinc-300 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Recent Named Checkpoints</h3>
              <p className="text-sm text-zinc-600">
                Use these files as the durable restore points to commit in Git.
              </p>
            </div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {namedCheckpoints.length} file{namedCheckpoints.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-zinc-100 text-left">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2">Created</th>
                  <th className="border-b border-zinc-200 px-3 py-2">File</th>
                  <th className="border-b border-zinc-200 px-3 py-2">Counts</th>
                  <th className="border-b border-zinc-200 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {namedCheckpoints.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-zinc-500"
                      colSpan={4}
                    >
                      No named checkpoints created yet.
                    </td>
                  </tr>
                )}
                {namedCheckpoints.map((checkpoint) => (
                  <tr key={checkpoint.fileName}>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      {formatDateTime(checkpoint.metadata.created_at)}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 font-mono text-xs">
                      {checkpoint.relativePath}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2">
                      intake {checkpoint.metadata.counts.intake_count}, drafts{" "}
                      {checkpoint.metadata.counts.draft_count}, published{" "}
                      {checkpoint.metadata.counts.published_idea_count}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-right">
                      {canPreviewRestore ? (
                        <Link
                          href={`/studio/checkpoint?file=${encodeURIComponent(checkpoint.fileName)}`}
                          className="rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-600"
                        >
                          Dry run restore
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">Editor+</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded border border-zinc-300 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Restore Dry Run</h3>
              <p className="text-sm text-zinc-600">
                Validate a named checkpoint before restore. Restore execution is
                admin-only.
              </p>
            </div>
            {selectedFile && (
              <Link
                href="/studio/checkpoint"
                className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
              >
                Clear selection
              </Link>
            )}
          </div>

          {!canPreviewRestore ? (
            <p className="mt-4 text-sm text-zinc-500">
              Editors and admins can run restore dry-run validation.
            </p>
          ) : !selectedFile ? (
            <p className="mt-4 text-sm text-zinc-500">
              Select a named checkpoint above to validate restore readiness.
            </p>
          ) : dryRunError ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {dryRunError}
            </p>
          ) : dryRunReport ? (
            <div className="mt-4 space-y-4">
              <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p className="font-medium">{dryRunReport.fileName}</p>
                <p className="mt-1 text-zinc-600">
                  Created {formatDateTime(dryRunReport.metadata?.created_at ?? "")}
                </p>
                <p className="mt-2">
                  intake {dryRunReport.metadata?.counts.intake_count ?? 0}, drafts{" "}
                  {dryRunReport.metadata?.counts.draft_count ?? 0}, published{" "}
                  {dryRunReport.metadata?.counts.published_idea_count ?? 0}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded border border-zinc-200 p-4">
                  <h4 className="font-semibold">Blockers</h4>
                  {dryRunReport.blockers.length === 0 ? (
                    <p className="mt-2 text-sm text-green-700">No blockers found.</p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-red-700">
                      {dryRunReport.blockers.map((blocker) => (
                        <li key={blocker}>- {blocker}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded border border-zinc-200 p-4">
                  <h4 className="font-semibold">Warnings</h4>
                  {dryRunReport.warnings.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">No warnings.</p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-amber-700">
                      {dryRunReport.warnings.map((warning) => (
                        <li key={warning}>- {warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <p>
                  Final decision:{" "}
                  <span
                    className={
                      dryRunReport.canRestore
                        ? "font-medium text-green-700"
                        : "font-medium text-red-700"
                    }
                  >
                    {dryRunReport.canRestore ? "can restore" : "blocked"}
                  </span>
                </p>

                {canRestore ? (
                  <form action={restoreCheckpointAction} className="mt-4">
                    <input type="hidden" name="file_name" value={dryRunReport.fileName} />
                    <button
                      type="submit"
                      disabled={!dryRunReport.canRestore}
                      className={`rounded px-4 py-2 text-sm text-white ${
                        dryRunReport.canRestore
                          ? "bg-red-700 hover:bg-red-600"
                          : "bg-zinc-400"
                      }`}
                    >
                      Restore checkpoint
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-zinc-500">
                    Admin access is required to execute restore.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </StudioShell>
  );
}
