import { notFound, redirect } from "next/navigation";

import DraftEditorForm from "@/components/studio/DraftEditorForm";
import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  DRAFT_STATUSES,
  extractTraitSelectionsFromFormData,
  getDraftById,
  getTraitSelectionsForDraft,
  isStatusTransitionAllowed,
  parseDraftEditableFields,
  parseDraftStatus,
  publishDraftToIdea,
  saveDraft,
  type DraftStatus,
} from "@/lib/studio/drafts";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type EditDraftPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    warn?: string;
    info?: string;
    published?: string;
    created?: string;
  }>;
};

export default async function StudioEditDraftPage({
  params,
  searchParams,
}: EditDraftPageProps) {
  const studioUser = await requireStudioUser("viewer");
  const { id } = await params;
  const query = (await searchParams) ?? {};

  const [snapshot, draft, traitSelections] = await Promise.all([
    getIdeaRegistrySnapshot(),
    getDraftById(id),
    getTraitSelectionsForDraft(id),
  ]);

  if (!draft) {
    notFound();
  }

  const canEdit = hasStudioRoleAtLeast(studioUser.role, "editor");

  const transitionOptions: DraftStatus[] = DRAFT_STATUSES.filter(
    (status) =>
      status !== "published" && isStatusTransitionAllowed(draft.status, status),
  );

  async function saveDraftAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const formDraftId = String(formData.get("draft_id") ?? "");

    if (!formDraftId || formDraftId !== id) {
      redirect(`/studio/drafts/${id}?error=${encodeURIComponent("Invalid draft id.")}`);
    }

    const registry = await getIdeaRegistrySnapshot();
    const baseFields = parseDraftEditableFields(formData);
    const traitSelectionsByTypeSlug = extractTraitSelectionsFromFormData(
      formData,
      registry.bindings,
    );

    const nextStatus = parseDraftStatus(formData.get("next_status"));

    const result = await saveDraft({
      draftId: formDraftId,
      updatedByUserId: actingUser.userId,
      nextStatus,
      baseFields,
      traitSelectionsByTypeSlug,
      bindings: registry.bindings,
    });

    if (!result.ok) {
      redirect(
        `/studio/drafts/${formDraftId}?error=${encodeURIComponent(result.message ?? "Failed to save draft.")}`,
      );
    }

    const params = new URLSearchParams({ saved: "1" });

    if (result.message) {
      params.set("info", result.message);
    }

    redirect(`/studio/drafts/${formDraftId}?${params.toString()}`);
  }

  async function publishDraftAction(formData: FormData) {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const formDraftId = String(formData.get("draft_id") ?? "");

    if (!formDraftId || formDraftId !== id) {
      redirect(`/studio/drafts/${id}?error=${encodeURIComponent("Invalid draft id.")}`);
    }

    try {
      const result = await publishDraftToIdea({
        draftId: formDraftId,
        actorUserId: actingUser.userId,
      });

      const params = new URLSearchParams({
        published: "1",
        created: result.createdIdea ? "1" : "0",
      });

      redirect(`/studio/drafts/${formDraftId}?${params.toString()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to publish draft.";
      redirect(`/studio/drafts/${formDraftId}?error=${encodeURIComponent(message)}`);
    }
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Edit Draft</h2>
          <p className="text-sm text-zinc-600">Draft ID: {draft.id}</p>
        </div>

        {query.saved && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Draft saved.
          </p>
        )}

        {query.info && (
          <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {query.info}
          </p>
        )}

        {query.published && (
          <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {query.created === "1"
              ? "Draft published to a new idea."
              : "Draft re-published to its linked idea."}
          </p>
        )}

        {query.error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        {query.warn && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Draft was promoted, but one or more non-blocking sync warnings were recorded.
          </p>
        )}

        <DraftEditorForm
          draft={draft}
          bindings={snapshot.bindings}
          initialTraitSelections={traitSelections}
          canEdit={canEdit}
          transitionOptions={transitionOptions}
          saveAction={saveDraftAction}
          publishAction={publishDraftAction}
        />
      </section>
    </StudioShell>
  );
}
