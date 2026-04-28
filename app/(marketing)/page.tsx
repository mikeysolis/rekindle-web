import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 text-zinc-950">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-8">
        <header className="flex items-center justify-between gap-6">
          <p className="text-base font-semibold">Rekindle</p>
          <nav className="flex gap-5 text-sm text-zinc-600">
            <Link className="hover:text-zinc-950" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-zinc-950" href="/terms">
              Terms
            </Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20">
          <p className="text-sm font-medium uppercase text-zinc-500">
            Relationship reminders
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-zinc-950 sm:text-6xl">
            Remember the people who matter.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Rekindle helps you keep track of thoughtful plans, reminders, and
            small gestures for the people in your life.
          </p>
        </section>

        <footer className="border-t border-zinc-200 py-6 text-sm text-zinc-500">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-zinc-950" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-zinc-950" href="/terms">
              Terms of Service
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
