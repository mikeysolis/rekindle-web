import Link from "next/link";
import { redirect } from "next/navigation";

import StudioShell from "@/components/studio/StudioShell";
import { requireStudioUser } from "@/lib/studio/auth";
import { hasStudioRoleAtLeast } from "@/lib/studio/roles";
import { createSupabaseServerClient } from "@/lib/database/server";

export default async function StudioDashboardPage() {
  const studioUser = await requireStudioUser("viewer");

  async function signOutAction() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/studio/login");
  }

  return (
    <StudioShell role={studioUser.role} email={studioUser.email}>
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Studio Dashboard</h2>
        <p className="text-sm text-zinc-600">
          Review ingestion candidates, edit drafts, and use Registry to verify traits.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            className="rounded border border-zinc-300 bg-white p-4 hover:border-zinc-600"
            href="/studio/drafts"
          >
            <h3 className="font-medium">Drafts</h3>
            <p className="mt-1 text-sm text-zinc-600">Create and edit idea drafts.</p>
          </Link>
          <Link
            className="rounded border border-zinc-300 bg-white p-4 hover:border-zinc-600"
            href="/studio/ingestion"
          >
            <h3 className="font-medium">Ingestion</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Review scraped candidates before promotion.
            </p>
          </Link>
          <Link
            className="rounded border border-zinc-300 bg-white p-4 hover:border-zinc-600"
            href="/studio/registry"
          >
            <h3 className="font-medium">Registry</h3>
            <p className="mt-1 text-sm text-zinc-600">Inspect trait types, options, and bindings.</p>
          </Link>
          <Link
            className="rounded border border-zinc-300 bg-white p-4 hover:border-zinc-600"
            href="/studio/export"
          >
            <h3 className="font-medium">Export</h3>
            <p className="mt-1 text-sm text-zinc-600">Download publishable drafts as CSV.</p>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm hover:border-zinc-600"
            >
              Sign out
            </button>
          </form>
          {!hasStudioRoleAtLeast(studioUser.role, "editor") && (
            <p className="text-xs text-zinc-500">
              You currently have read-only viewer access.
            </p>
          )}
        </div>
      </section>
    </StudioShell>
  );
}
