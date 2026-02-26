import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/database/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    email?: string;
    sent?: string;
  }>;
};

function getSafeNextPath(candidate: string | null): string {
  if (candidate && candidate.startsWith("/studio")) {
    return candidate;
  }

  return "/studio";
}

function buildLoginUrl(params: {
  error?: string;
  next?: string;
  email?: string;
  sent?: boolean;
}): string {
  const search = new URLSearchParams();

  if (params.error) {
    search.set("error", params.error);
  }
  if (params.next) {
    search.set("next", params.next);
  }
  if (params.email) {
    search.set("email", params.email);
  }
  if (params.sent) {
    search.set("sent", "1");
  }

  const query = search.toString();
  return query ? `/studio/login?${query}` : "/studio/login";
}

export default async function StudioLoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(params.next ?? null);
  const email = String(params.email ?? "").trim();
  const codeSent = params.sent === "1" && email.length > 0;

  async function sendCodeAction(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const emailInput = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const next = getSafeNextPath(String(formData.get("next") ?? ""));

    if (!emailInput) {
      redirect(
        buildLoginUrl({
          error: "Email is required.",
          next,
        }),
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      redirect(
        buildLoginUrl({
          error: error.message,
          next,
          email: emailInput,
        }),
      );
    }

    redirect(
      buildLoginUrl({
        next,
        email: emailInput,
        sent: true,
      }),
    );
  }

  async function verifyCodeAction(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const emailInput = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const next = getSafeNextPath(String(formData.get("next") ?? ""));
    const code = String(formData.get("code") ?? "")
      .trim()
      .replace(/\s+/g, "");

    if (!emailInput) {
      redirect(
        buildLoginUrl({
          error: "Email is required.",
          next,
        }),
      );
    }

    if (!/^\d{6}$/.test(code)) {
      redirect(
        buildLoginUrl({
          error: "Enter the 6-digit code from your email.",
          next,
          email: emailInput,
          sent: true,
        }),
      );
    }

    const { error } = await supabase.auth.verifyOtp({
      email: emailInput,
      token: code,
      type: "email",
    });

    if (error) {
      redirect(
        buildLoginUrl({
          error: error.message,
          next,
          email: emailInput,
          sent: true,
        }),
      );
    }

    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8 text-zinc-900">
      <div className="w-full max-w-md rounded border border-zinc-300 bg-white p-6">
        <h1 className="text-xl font-semibold">Studio Login</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in with an allowlisted Studio account using email code.
        </p>

        {params.error && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        {!codeSent && (
          <form action={sendCodeAction} className="mt-4 space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={email}
                required
              />
            </label>

            <button
              className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              type="submit"
            >
              Send code
            </button>
          </form>
        )}

        {codeSent && (
          <form action={verifyCodeAction} className="mt-4 space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="email" value={email} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                className="w-full rounded border border-zinc-300 bg-zinc-100 px-3 py-2"
                type="email"
                value={email}
                readOnly
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">6-digit code</span>
              <input
                className="w-full rounded border border-zinc-300 px-3 py-2 tracking-[0.2em]"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
            </label>

            <button
              className="w-full rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              type="submit"
            >
              Verify code
            </button>
          </form>
        )}

        {codeSent && (
          <form action={sendCodeAction} className="mt-3">
            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="text-xs text-zinc-600 underline hover:text-zinc-900"
            >
              Resend code
            </button>
          </form>
        )}

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
