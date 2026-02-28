import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  getIngestionCandidateDetail,
  markIngestionCandidateNeedsWork,
  promoteIngestionCandidateToDraft,
  rejectIngestionCandidate,
} from "@/lib/studio/ingestion";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type IngestionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; error?: string; warn?: string }>;
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

function normalizeNote(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeMeta(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function readQualityMeta(meta: Record<string, unknown>): {
  version: string;
  score: number | null;
  threshold: number | null;
  passed: boolean | null;
  flags: string[];
} | null {
  const value = meta.quality;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const quality = value as Record<string, unknown>;
  const score = typeof quality.score === "number" ? quality.score : null;
  const threshold = typeof quality.threshold === "number" ? quality.threshold : null;
  const passed = typeof quality.passed === "boolean" ? quality.passed : null;
  const flags = Array.isArray(quality.flags)
    ? quality.flags.map((entry) => String(entry))
    : [];

  return {
    version: String(quality.version ?? "unknown"),
    score,
    threshold,
    passed,
    flags,
  };
}

export default async function StudioIngestionDetailPage({
  params,
  searchParams,
}: IngestionDetailPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const { id } = await params;
  const query = (await searchParams) ?? {};

  const detail = await getIngestionCandidateDetail(id);
  if (!detail) {
    notFound();
  }
  const qualityMeta = readQualityMeta(detail.candidate.metaJson);

  const canEdit = hasStudioRoleAtLeast(studioUser.role, "editor");
  const latestPromotedDraftId =
    detail.syncLog.find(
      (entry) =>
        entry.targetSystem === "app_draft" &&
        entry.status === "success" &&
        Boolean(entry.targetId),
    )?.targetId ?? null;

  async function rejectAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");

    if (!candidateId || candidateId !== id) {
      redirect(`/studio/ingestion/${id}?error=${encodeURIComponent("Invalid candidate id.")}`);
    }

    await rejectIngestionCandidate({
      candidateId,
      actorUserId: actingUser.userId,
      note: normalizeNote(formData.get("note")),
    });

    redirect(`/studio/ingestion/${candidateId}?saved=rejected`);
  }

  async function needsWorkAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");

    if (!candidateId || candidateId !== id) {
      redirect(`/studio/ingestion/${id}?error=${encodeURIComponent("Invalid candidate id.")}`);
    }

    await markIngestionCandidateNeedsWork({
      candidateId,
      actorUserId: actingUser.userId,
      note: normalizeNote(formData.get("note")),
    });

    redirect(`/studio/ingestion/${candidateId}?saved=needs-work`);
  }

  async function promoteAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");

    if (!candidateId || candidateId !== id) {
      redirect(`/studio/ingestion/${id}?error=${encodeURIComponent("Invalid candidate id.")}`);
    }

    const result = await promoteIngestionCandidateToDraft({
      candidateId,
      actorUserId: actingUser.userId,
    });

    const warningQuery = result.warnings.length > 0 ? "?warn=1" : "";
    redirect(`/studio/drafts/${result.draftId}${warningQuery}`);
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Ingestion Candidate</h2>
            <p className="text-sm text-zinc-600">Candidate ID: {detail.candidate.id}</p>
          </div>
          <Link
            href="/studio/ingestion"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
          >
            Back to inbox
          </Link>
        </div>

        {query.saved && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Candidate updated: {query.saved}.
          </p>
        )}

        {query.error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-4 rounded border border-zinc-300 bg-white p-4">
            <div>
              <h3 className="text-lg font-semibold">{detail.candidate.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {detail.candidate.sourceKey} • {detail.candidate.status}
              </p>
            </div>

            {detail.candidate.description && (
              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {detail.candidate.description}
                </p>
              </div>
            )}

            {detail.candidate.reasonSnippet && (
              <div>
                <h4 className="text-sm font-medium">Reason snippet</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {detail.candidate.reasonSnippet}
                </p>
              </div>
            )}

            {detail.candidate.rawExcerpt && (
              <div>
                <h4 className="text-sm font-medium">Raw excerpt</h4>
                <p className="mt-1 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  {detail.candidate.rawExcerpt}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {formatDateTime(detail.candidate.updatedAt)}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {formatDateTime(detail.candidate.createdAt)}
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium">Source URL:</span>{" "}
                <a
                  href={detail.candidate.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 underline"
                >
                  {detail.candidate.sourceUrl}
                </a>
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium">Candidate key:</span>{" "}
                <span className="font-mono text-xs">{detail.candidate.candidateKey}</span>
              </p>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
              <h3 className="font-semibold">Actions</h3>
              {!canEdit && (
                <p className="mt-2 text-zinc-600">
                  You have read-only access. Editors/admins can reject, mark needs work, or
                  promote.
                </p>
              )}
              {canEdit && (
                <div className="mt-3 space-y-3">
                  <form action={promoteAction} className="space-y-2">
                    <input type="hidden" name="candidate_id" value={detail.candidate.id} />
                    <button
                      type="submit"
                      className="w-full rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      Promote to Draft
                    </button>
                  </form>

                  <form action={needsWorkAction} className="space-y-2">
                    <input type="hidden" name="candidate_id" value={detail.candidate.id} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Needs Work note</span>
                      <textarea
                        name="note"
                        className="min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
                        placeholder="Optional cleanup guidance"
                      />
                    </label>
                    <button
                      type="submit"
                      className="w-full rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
                    >
                      Mark Needs Work
                    </button>
                  </form>

                  <form action={rejectAction} className="space-y-2">
                    <input type="hidden" name="candidate_id" value={detail.candidate.id} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Reject note</span>
                      <textarea
                        name="note"
                        className="min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
                        placeholder="Optional rejection reason"
                      />
                    </label>
                    <button
                      type="submit"
                      className="w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:border-red-500"
                    >
                      Reject Candidate
                    </button>
                  </form>
                </div>
              )}
            </section>

            {latestPromotedDraftId && (
              <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
                <h3 className="font-semibold">Latest Draft Link</h3>
                <Link
                  href={`/studio/drafts/${latestPromotedDraftId}`}
                  className="mt-2 inline-flex rounded border border-zinc-300 px-3 py-2 text-xs hover:border-zinc-600"
                >
                  Open draft {latestPromotedDraftId}
                </Link>
              </section>
            )}
          </aside>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border border-zinc-300 bg-white p-4">
            <h3 className="text-lg font-semibold">Quality Assessment</h3>
            {!qualityMeta ? (
              <p className="mt-2 text-sm text-zinc-500">No machine quality metadata.</p>
            ) : (
              <div className="mt-2 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Rule version:</span> {qualityMeta.version}
                </p>
                <p>
                  <span className="font-medium">Score:</span>{" "}
                  {qualityMeta.score !== null ? qualityMeta.score.toFixed(3) : "-"}{" "}
                  {qualityMeta.threshold !== null && (
                    <span className="text-zinc-600">
                      (threshold {qualityMeta.threshold.toFixed(3)})
                    </span>
                  )}
                </p>
                <p>
                  <span className="font-medium">Result:</span>{" "}
                  {qualityMeta.passed === null ? "-" : qualityMeta.passed ? "passed" : "filtered"}
                </p>
                <div>
                  <p className="font-medium">Flags</p>
                  {qualityMeta.flags.length === 0 ? (
                    <p className="text-zinc-500">No quality flags.</p>
                  ) : (
                    <ul className="mt-1 list-disc pl-5 text-zinc-700">
                      {qualityMeta.flags.map((flag) => (
                        <li key={flag} className="font-mono text-xs">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded border border-zinc-300 bg-white p-4">
            <h3 className="text-lg font-semibold">Duplicate Hints</h3>
            {detail.duplicateHints.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No likely duplicates found.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.duplicateHints.map((hint) => (
                  <li key={hint.candidateId} className="rounded border border-zinc-200 bg-zinc-50 p-2">
                    <p className="font-medium">{hint.title}</p>
                    <p className="text-xs text-zinc-600">
                      similarity: {hint.similarityScore.toFixed(3)} • status: {hint.status}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      reasons: {hint.reasons.join(", ")}
                    </p>
                    <Link
                      href={`/studio/ingestion/${hint.candidateId}`}
                      className="mt-2 inline-flex rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-600"
                    >
                      Open candidate
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-zinc-300 bg-white p-4">
            <h3 className="text-lg font-semibold">Trait Hints</h3>
            {detail.traits.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No candidate trait hints.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.traits.map((trait) => (
                  <li key={trait.id} className="rounded border border-zinc-200 bg-zinc-50 p-2">
                    <p>
                      <span className="font-medium">{trait.traitTypeSlug}</span> ={" "}
                      {trait.traitOptionSlug}
                    </p>
                    <p className="text-xs text-zinc-600">
                      confidence: {trait.confidence ?? "-"} • source: {trait.source ?? "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-zinc-300 bg-white p-4">
            <h3 className="text-lg font-semibold">Sync Log</h3>
            {detail.syncLog.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No sync events yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.syncLog.map((entry) => (
                  <li key={entry.id} className="rounded border border-zinc-200 bg-zinc-50 p-2">
                    <p>
                      <span className="font-medium">{entry.targetSystem}</span> • {entry.status}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {formatDateTime(entry.syncedAt)}
                      {entry.targetId ? ` • target: ${entry.targetId}` : ""}
                    </p>
                    {entry.errorText && (
                      <p className="mt-1 text-xs text-red-700">{entry.errorText}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded border border-zinc-300 bg-white p-4">
          <h3 className="text-lg font-semibold">Metadata (raw)</h3>
          <pre className="mt-2 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs">
            {serializeMeta(detail.candidate.metaJson)}
          </pre>
        </section>
      </section>
    </StudioShell>
  );
}
