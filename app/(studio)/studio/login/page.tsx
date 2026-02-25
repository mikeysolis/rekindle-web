import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/database/server";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; next?: string }>;
};

function getSafeNextPath(candidate: string | null): string {
  if (candidate && candidate.startsWith("/studio")) {
    return candidate;
  }

  return "/studio";
}

export default async function StudioLoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(params.next ?? null);

  async function signInAction(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const next = getSafeNextPath(String(formData.get("next") ?? ""));

    if (!email || !password) {
      redirect(`/studio/login?error=${encodeURIComponent("Email and password are required.")}`);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/studio/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
    }

    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="w-full max-w-md rounded border border-zinc-300 bg-white p-6">
        <h1 className="text-xl font-semibold">Studio Login</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in with an allowlisted Studio account.
        </p>

        {params.error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action={signInAction} className="mt-4 space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              className="w-full rounded border border-zinc-300 px-3 py-2"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              className="w-full rounded border border-zinc-300 px-3 py-2"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            type="submit"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-500">
          Need access? Contact a Studio admin to add your user to `studio_users`.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          <Link className="underline" href="/">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}
