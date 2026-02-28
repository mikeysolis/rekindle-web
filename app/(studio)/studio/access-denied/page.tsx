import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/database/server";

export default function StudioAccessDeniedPage() {
  async function signOutAction() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/studio/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="w-full max-w-lg rounded border border-zinc-300 bg-white p-6">
        <h1 className="text-xl font-semibold">Access not granted</h1>
        <p className="mt-2 text-sm text-zinc-700">
          Your account is authenticated but is not allowlisted in `studio_users`.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/studio/login"
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-600"
          >
            Back to login
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
