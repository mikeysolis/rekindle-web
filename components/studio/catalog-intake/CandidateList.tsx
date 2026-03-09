import Link from "next/link";

import type {
  CatalogImportClusterCandidate,
  CatalogImportRejectReasonCode,
} from "@/lib/studio/catalog-intake";

type CandidateListProps = {
  candidates: CatalogImportClusterCandidate[];
  canEdit: boolean;
  clusterPreferredCandidateId: string | null;
  fromBatchId: string | null;
  rejectReasonOptions: Array<{
    code: CatalogImportRejectReasonCode;
    label: string;
    description: string;
  }>;
  onSetPreferred: (formData: FormData) => Promise<void>;
  onSetAlternate: (formData: FormData) => Promise<void>;
  onNeedsRewrite: (formData: FormData) => Promise<void>;
  onReject: (formData: FormData) => Promise<void>;
  onPromote: (formData: FormData) => Promise<void>;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function CandidateList({
  candidates,
  canEdit,
  clusterPreferredCandidateId,
  fromBatchId,
  rejectReasonOptions,
  onSetPreferred,
  onSetAlternate,
  onNeedsRewrite,
  onReject,
  onPromote,
}: CandidateListProps) {
  return (
    <div className="space-y-4">
      {candidates.length === 0 && (
        <div className="rounded border border-zinc-300 bg-white p-4 text-sm text-zinc-500">
          No candidates found for this cluster.
        </div>
      )}
      {candidates.map((candidate) => {
        const isPreferred =
          clusterPreferredCandidateId === candidate.candidateId || candidate.preferredInCluster;
        const canPromote =
          candidate.editorState !== "rejected" &&
          !candidate.linkedDraftId &&
          (clusterPreferredCandidateId === null ||
            clusterPreferredCandidateId === candidate.candidateId);
        const metadataLine = [
          candidate.batchCode,
          `row ${candidate.sourceRowNumber}`,
          candidate.editorState,
          candidate.machineDuplicateState,
        ].join(" • ");

        return (
          <section
            key={candidate.candidateId}
            className="rounded border border-zinc-300 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{candidate.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">{metadataLine}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isPreferred && (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                    preferred
                  </span>
                )}
                {candidate.linkedDraftId && (
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                    draft linked
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <p>
                <span className="font-medium">Machine score:</span>{" "}
                {candidate.machineScore === null ? "-" : candidate.machineScore.toFixed(4)}
              </p>
              <p>
                <span className="font-medium">Specificity:</span>{" "}
                {candidate.specificityLevel ?? "-"}
              </p>
              <p>
                <span className="font-medium">Event anchor:</span>{" "}
                {candidate.eventAnchor ?? "-"}
              </p>
              <p>
                <span className="font-medium">Anchor family:</span>{" "}
                {candidate.anchorFamily ?? "-"}
              </p>
              <p>
                <span className="font-medium">Duplicate candidate:</span>{" "}
                {candidate.duplicateOfCandidateId ?? "-"}
              </p>
              <p>
                <span className="font-medium">Duplicate idea:</span>{" "}
                {candidate.duplicateOfIdeaId ?? "-"}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {formatDateTime(candidate.createdAt)}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{" "}
                {formatDateTime(candidate.updatedAt)}
              </p>
            </div>

            {candidate.editorNote && (
              <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p className="font-medium">Editor note</p>
                <p className="mt-1 whitespace-pre-wrap">{candidate.editorNote}</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link
                href={`/studio/catalog-intake/${candidate.batchId}`}
                className="rounded border border-zinc-300 px-3 py-2 hover:border-zinc-600"
              >
                Open batch
              </Link>
              {candidate.linkedDraftId && (
                <Link
                  href={`/studio/drafts/${candidate.linkedDraftId}`}
                  className="rounded border border-zinc-300 px-3 py-2 hover:border-zinc-600"
                >
                  Open linked draft
                </Link>
              )}
              {fromBatchId && fromBatchId !== candidate.batchId && (
                <Link
                  href={`/studio/catalog-intake/${fromBatchId}`}
                  className="rounded border border-zinc-300 px-3 py-2 hover:border-zinc-600"
                >
                  Back to source batch
                </Link>
              )}
            </div>

            {!canEdit && (
              <p className="mt-4 text-sm text-zinc-600">
                You have read-only access. Editors and admins can review and mutate candidate
                state.
              </p>
            )}

            {canEdit && (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded border border-zinc-200 p-3">
                  <h4 className="text-sm font-semibold">Quick actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {candidate.editorState !== "rejected" &&
                      candidate.editorState !== "promoted" &&
                      !isPreferred && (
                        <form action={onSetPreferred}>
                          <input type="hidden" name="candidate_id" value={candidate.candidateId} />
                          <input
                            type="hidden"
                            name="cluster_id"
                            value={candidate.clusterId ?? ""}
                          />
                          <input type="hidden" name="from_batch" value={fromBatchId ?? ""} />
                          <button
                            type="submit"
                            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                          >
                            Set preferred
                          </button>
                        </form>
                      )}
                    {candidate.editorState !== "promoted" &&
                      candidate.editorState !== "alternate" && (
                        <form action={onSetAlternate}>
                          <input type="hidden" name="candidate_id" value={candidate.candidateId} />
                          <input type="hidden" name="from_batch" value={fromBatchId ?? ""} />
                          <button
                            type="submit"
                            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
                          >
                            Set alternate
                          </button>
                        </form>
                      )}
                    {canPromote && (
                      <form action={onPromote}>
                        <input type="hidden" name="candidate_id" value={candidate.candidateId} />
                        <input type="hidden" name="from_batch" value={fromBatchId ?? ""} />
                        <button
                          type="submit"
                          className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 hover:border-green-500"
                        >
                          Promote to draft
                        </button>
                      </form>
                    )}
                  </div>
                  {!canPromote && !candidate.linkedDraftId && candidate.editorState !== "rejected" && (
                    <p className="text-xs text-zinc-500">
                      Only the preferred candidate can be promoted once a cluster preference is set.
                    </p>
                  )}
                </div>

                <form action={onNeedsRewrite} className="space-y-2 rounded border border-zinc-200 p-3">
                  <h4 className="text-sm font-semibold">Mark needs rewrite</h4>
                  <input type="hidden" name="candidate_id" value={candidate.candidateId} />
                  <input type="hidden" name="from_batch" value={fromBatchId ?? ""} />
                  <textarea
                    name="note"
                    className="min-h-24 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Optional rewrite guidance"
                  />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-2 text-sm hover:border-zinc-600"
                  >
                    Save needs rewrite
                  </button>
                </form>

                <form action={onReject} className="space-y-2 rounded border border-zinc-200 p-3 xl:col-span-2">
                  <h4 className="text-sm font-semibold">Reject candidate</h4>
                  <input type="hidden" name="candidate_id" value={candidate.candidateId} />
                  <input type="hidden" name="from_batch" value={fromBatchId ?? ""} />
                  <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr_auto]">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Reason</span>
                      <select
                        name="reason_code"
                        className="w-full rounded border border-zinc-300 px-3 py-2"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select reason
                        </option>
                        {rejectReasonOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Note</span>
                      <input
                        name="note"
                        className="w-full rounded border border-zinc-300 px-3 py-2"
                        placeholder="Optional rejection note"
                      />
                    </label>
                    <div className="self-end">
                      <button
                        type="submit"
                        className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:border-red-500"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
