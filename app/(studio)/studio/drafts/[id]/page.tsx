import { notFound, redirect } from "next/navigation";

import PublishGatePanel from "@/components/studio/PublishGatePanel";
import StudioShell from "@/components/studio/StudioShell";
import TraitPicker from "@/components/studio/TraitPicker";
import { requireStudioUser } from "@/lib/studio/auth";
import {
  DRAFT_STATUSES,
  extractTraitSelectionsFromFormData,
  getDraftById,
  getTraitSelectionsForDraft,
  isStatusTransitionAllowed,
  parseDraftEditableFields,
  parseDraftStatus,
  saveDraft,
  type DraftStatus,
} from "@/lib/studio/drafts";
import { evaluatePublishGate } from "@/lib/studio/publish-gate";
import { getIdeaRegistrySnapshot } from "@/lib/studio/registry";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";

type EditDraftPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

const TIERS: Array<1 | 2 | 3> = [1, 2, 3];

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

  const gate = evaluatePublishGate({
    title: draft.title,
    reasonSnippet: draft.reasonSnippet,
    description: draft.description,
    minMinutes: draft.minMinutes,
    maxMinutes: draft.maxMinutes,
    traitSelectionsByTypeSlug: traitSelections,
    bindings: snapshot.bindings,
  });

  const transitionOptions: DraftStatus[] = DRAFT_STATUSES.filter((status) =>
    isStatusTransitionAllowed(draft.status, status),
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

    redirect(`/studio/drafts/${formDraftId}?saved=1`);
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

        {query.error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        <form action={saveDraftAction} className="space-y-6">
          <input type="hidden" name="draft_id" value={draft.id} />

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4 rounded border border-zinc-300 bg-white p-4">
              <h3 className="text-lg font-semibold">Base Fields</h3>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Title</span>
                <input
                  name="title"
                  defaultValue={draft.title ?? ""}
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Reason snippet</span>
                <textarea
                  name="reason_snippet"
                  defaultValue={draft.reasonSnippet ?? ""}
                  className="min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Description</span>
                <textarea
                  name="description"
                  defaultValue={draft.description ?? ""}
                  className="min-h-32 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Min minutes</span>
                  <input
                    type="number"
                    name="min_minutes"
                    defaultValue={draft.minMinutes ?? ""}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                    disabled={!canEdit}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Max minutes</span>
                  <input
                    type="number"
                    name="max_minutes"
                    defaultValue={draft.maxMinutes ?? ""}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                    disabled={!canEdit}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Steps</span>
                <textarea
                  name="steps"
                  defaultValue={draft.steps ?? ""}
                  className="min-h-20 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">What you need</span>
                <textarea
                  name="what_you_need"
                  defaultValue={draft.whatYouNeed ?? ""}
                  className="min-h-16 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Tips / variations</span>
                <textarea
                  name="tips_or_variations"
                  defaultValue={draft.tipsOrVariations ?? ""}
                  className="min-h-16 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Safety / boundaries note</span>
                <textarea
                  name="safety_or_boundaries_note"
                  defaultValue={draft.safetyOrBoundariesNote ?? ""}
                  className="min-h-16 w-full rounded border border-zinc-300 px-3 py-2"
                  disabled={!canEdit}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Source URL</span>
                  <input
                    name="source_url"
                    defaultValue={draft.sourceUrl ?? ""}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                    disabled={!canEdit}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Editorial note</span>
                  <input
                    name="editorial_note"
                    defaultValue={draft.editorialNote ?? ""}
                    className="w-full rounded border border-zinc-300 px-3 py-2"
                    disabled={!canEdit}
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={draft.active}
                  disabled={!canEdit}
                />
                Active
              </label>
            </section>

            <div className="space-y-4">
              <PublishGatePanel gate={gate} />

              <section className="rounded border border-zinc-300 bg-white p-4 text-sm">
                <h3 className="font-semibold">Status</h3>
                {canEdit ? (
                  <label className="mt-3 block">
                    <span className="mb-1 block font-medium">Next status</span>
                    <select
                      className="w-full rounded border border-zinc-300 px-3 py-2"
                      name="next_status"
                      defaultValue={draft.status}
                    >
                      {transitionOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="mt-2">Current status: {draft.status}</p>
                )}

                <p className="mt-3 text-xs text-zinc-500">
                  Only editors/admins can save changes. Setting `publishable` requires gate pass.
                </p>
              </section>

              {canEdit && (
                <button
                  type="submit"
                  className="w-full rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  Save changes
                </button>
              )}
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">Trait Tagging</h3>
            {TIERS.map((tier) => {
              const tierBindings = snapshot.bindings.filter(
                (binding) => binding.tier === tier,
              );

              if (tierBindings.length === 0) {
                return null;
              }

              return (
                <div key={tier} className="space-y-3">
                  <h4 className="text-base font-semibold">Tier {tier}</h4>
                  <div className="grid gap-3">
                    {tierBindings.map((binding) => (
                      <TraitPicker
                        key={binding.id}
                        binding={binding}
                        selectedSlugs={traitSelections[binding.traitTypeSlug] ?? []}
                        disabled={!canEdit}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </form>
      </section>
    </StudioShell>
  );
}
