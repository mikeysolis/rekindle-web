import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
};

export function LegalPage({
  title,
  description,
  effectiveDate,
  children,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-6 py-8 sm:px-8 sm:py-12">
        <header className="border-b border-zinc-200 pb-8">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
          >
            Rekindle
          </Link>
          <p className="mt-8 text-sm font-medium uppercase text-zinc-500">
            Legal
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-zinc-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600">{description}</p>
          <p className="mt-5 text-sm text-zinc-500">
            Effective date: {effectiveDate}
          </p>
        </header>
        <article className="legal-document py-8">{children}</article>
        <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link className="hover:text-zinc-950" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="hover:text-zinc-950" href="/terms">
              Terms of Service
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
