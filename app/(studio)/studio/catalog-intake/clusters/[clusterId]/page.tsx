import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import CandidateList from "@/components/studio/catalog-intake/CandidateList";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  CATALOG_IMPORT_REJECT_REASON_OPTIONS,
  getCatalogImportCluster,
  listCatalogImportClusterBatches,
  markCatalogImportCandidateNeedsRewrite,
  promoteCatalogImportCandidateToDraft,
  rejectCatalogImportCandidate,
  setCatalogImportCandidateAlternate,
  setCatalogImportPreferredCandidate,
} from "@/lib/studio/catalog-intake";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type CatalogIntakeClusterDetailPageProps = {
  params: Promise<{ clusterId: string }>;
  searchParams?: Promise<{
    fromBatch?: string;
    saved?: string;
    error?: string;
    warn?: string;
  }>;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizeText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildClusterHref(clusterId: string, params: URLSearchParams): string {
  const queryString = params.toString();
  return queryString
    ? `/studio/catalog-intake/clusters/${clusterId}?${queryString}`
    : `/studio/catalog-intake/clusters/${clusterId}`;
}

export default async function StudioCatalogIntakeClusterDetailPage({
  params,
  searchParams,
}: CatalogIntakeClusterDetailPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const { clusterId } = await params;
  const query = (await searchParams) ?? {};
  const fromBatchId = (query.fromBatch ?? "").trim() || null;

  const [cluster, relatedBatches] = await Promise.all([
    getCatalogImportCluster(clusterId),
    listCatalogImportClusterBatches(clusterId),
  ]);

  if (!cluster) {
    notFound();
  }

  const canEdit = hasStudioRoleAtLeast(studioUser.role, "editor");

  async function setPreferredAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");
    const formClusterId = String(formData.get("cluster_id") ?? "");
    const nextFromBatch = String(formData.get("from_batch") ?? "").trim();
    const queryParams = new URLSearchParams();

    if (nextFromBatch) {
      queryParams.set("fromBatch", nextFromBatch);
    }

    if (!candidateId || formClusterId !== clusterId) {
      queryParams.set("error", "Invalid candidate or cluster id.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    try {
      await setCatalogImportPreferredCandidate({
        clusterId,
        candidateId,
        actorUserId: actingUser.userId,
        note: normalizeText(formData.get("note")),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queryParams.set("error", message);
      redirect(buildClusterHref(clusterId, queryParams));
    }

    queryParams.set("saved", "preferred");
    redirect(buildClusterHref(clusterId, queryParams));
  }

  async function setAlternateAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");
    const nextFromBatch = String(formData.get("from_batch") ?? "").trim();
    const queryParams = new URLSearchParams();

    if (nextFromBatch) {
      queryParams.set("fromBatch", nextFromBatch);
    }

    if (!candidateId) {
      queryParams.set("error", "Invalid candidate id.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    try {
      await setCatalogImportCandidateAlternate({
        candidateId,
        actorUserId: actingUser.userId,
        note: normalizeText(formData.get("note")),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queryParams.set("error", message);
      redirect(buildClusterHref(clusterId, queryParams));
    }

    queryParams.set("saved", "alternate");
    redirect(buildClusterHref(clusterId, queryParams));
  }

  async function needsRewriteAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");
    const nextFromBatch = String(formData.get("from_batch") ?? "").trim();
    const queryParams = new URLSearchParams();

    if (nextFromBatch) {
      queryParams.set("fromBatch", nextFromBatch);
    }

    if (!candidateId) {
      queryParams.set("error", "Invalid candidate id.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    try {
      await markCatalogImportCandidateNeedsRewrite({
        candidateId,
        actorUserId: actingUser.userId,
        note: normalizeText(formData.get("note")),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queryParams.set("error", message);
      redirect(buildClusterHref(clusterId, queryParams));
    }

    queryParams.set("saved", "needs-rewrite");
    redirect(buildClusterHref(clusterId, queryParams));
  }

  async function rejectAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");
    const nextFromBatch = String(formData.get("from_batch") ?? "").trim();
    const reasonCode = String(formData.get("reason_code") ?? "").trim();
    const queryParams = new URLSearchParams();

    if (nextFromBatch) {
      queryParams.set("fromBatch", nextFromBatch);
    }

    if (!candidateId) {
      queryParams.set("error", "Invalid candidate id.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    if (!reasonCode) {
      queryParams.set("error", "Reject reason is required.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    try {
      await rejectCatalogImportCandidate({
        candidateId,
        actorUserId: actingUser.userId,
        reasonCode,
        note: normalizeText(formData.get("note")),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      queryParams.set("error", message);
      redirect(buildClusterHref(clusterId, queryParams));
    }

    queryParams.set("saved", "rejected");
    redirect(buildClusterHref(clusterId, queryParams));
  }

  async function promoteAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const candidateId = String(formData.get("candidate_id") ?? "");

    if (!candidateId) {
      const queryParams = new URLSearchParams();
      if (fromBatchId) {
        queryParams.set("fromBatch", fromBatchId);
      }
      queryParams.set("error", "Invalid candidate id.");
      redirect(buildClusterHref(clusterId, queryParams));
    }

    const result = await promoteCatalogImportCandidateToDraft({
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
            <h2 className="text-2xl font-semibold">
              {cluster.canonicalTitle ?? "(Untitled cluster)"}
            </h2>
            <p className="text-sm text-zinc-600">
              Cluster ID: {cluster.clusterId} • {cluster.reviewStatus}
            </p>
          </div>
          <Link
            href={fromBatchId ? `/studio/catalog-intake/${fromBatchId}` : "/studio/catalog-intake"}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
          >
            {fromBatchId ? "Back to batch" : "Back to batches"}
          </Link>
        </div>

        {query.saved && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Cluster updated: {query.saved}.
          </p>
        )}

        {query.error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
            <h3 className="font-semibold">Cluster summary</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <p>
                <span className="font-medium">Family:</span> {cluster.family}
              </p>
              <p>
                <span className="font-medium">Preferred title:</span>{" "}
                {cluster.preferredTitle ?? "-"}
              </p>
              <p>
                <span className="font-medium">Event anchor:</span>{" "}
                {cluster.eventAnchor ?? "-"}
              </p>
              <p>
                <span className="font-medium">Anchor family:</span>{" "}
                {cluster.anchorFamily ?? "-"}
              </p>
              <p className="md:col-span-2">
                <span className="font-medium">Concept key:</span> {cluster.conceptKey ?? "-"}
              </p>
              <p>
                <span className="font-medium">Created:</span> {formatDateTime(cluster.createdAt)}
              </p>
              <p>
                <span className="font-medium">Updated:</span> {formatDateTime(cluster.updatedAt)}
              </p>
            </div>
            {cluster.editorialNote && (
              <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium">Editorial note</p>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700">
                  {cluster.editorialNote}
                </p>
              </div>
            )}
          </section>

          <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
            <h3 className="font-semibold">Links</h3>
            <div className="mt-3 space-y-2">
              <p>
                <span className="font-medium">Preferred candidate ID:</span>{" "}
                {cluster.preferredCandidateId ?? "-"}
              </p>
              <p>
                <span className="font-medium">Promoted draft:</span>{" "}
                {cluster.promotedDraftId ?? "-"}
              </p>
              <p>
                <span className="font-medium">Seen in batches:</span>{" "}
                {relatedBatches.length > 0 ? relatedBatches.length : 0}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedBatches.map((batch) => (
                <Link
                  key={batch.batchId}
                  href={`/studio/catalog-intake/${batch.batchId}`}
                  className="rounded border border-zinc-300 px-3 py-2 text-xs hover:border-zinc-600"
                >
                  {batch.batchCode}
                </Link>
              ))}
              {cluster.promotedDraftId && (
                <Link
                  href={`/studio/drafts/${cluster.promotedDraftId}`}
                  className="rounded border border-zinc-300 px-3 py-2 text-xs hover:border-zinc-600"
                >
                  Open draft
                </Link>
              )}
            </div>
          </section>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Cluster candidates</h3>
          <p className="text-sm text-zinc-600">
            Review all wording variants in this cluster, select the strongest candidate, and
            promote it into the existing Studio draft workflow.
          </p>
        </div>

        <CandidateList
          candidates={cluster.candidates}
          canEdit={canEdit}
          clusterPreferredCandidateId={cluster.preferredCandidateId}
          fromBatchId={fromBatchId}
          rejectReasonOptions={CATALOG_IMPORT_REJECT_REASON_OPTIONS}
          onSetPreferred={setPreferredAction}
          onSetAlternate={setAlternateAction}
          onNeedsRewrite={needsRewriteAction}
          onReject={rejectAction}
          onPromote={promoteAction}
        />
      </section>
    </StudioShell>
  );
}
