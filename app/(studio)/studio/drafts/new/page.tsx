import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import { createDraft } from "@/lib/studio/drafts";

export default async function StudioNewDraftPage() {
  const studioUser = await requireStudioUser("editor");

  async function createDraftAction() {
    "use server";

    const actingUser = await requireStudioUser("editor");
    const draftId = await createDraft(actingUser.userId);
    redirect(`/studio/drafts/${draftId}`);
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">New Draft</h2>
        <p className="text-sm text-zinc-600">
          Create a blank draft and continue in the editor.
        </p>
        <form action={createDraftAction}>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Create draft
          </button>
        </form>
      </section>
    </StudioShell>
  );
}
