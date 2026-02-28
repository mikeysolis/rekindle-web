import Link from "next/link";
import type { ReactNode } from "react";

import type { StudioRole } from "@/lib/studio/roles";

type StudioShellProps = {
  role: StudioRole;
  email: string | null;
  children: ReactNode;
};

const navLinkClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-sm hover:border-zinc-500";

export default function StudioShell({ role, email, children }: StudioShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Rekindle</p>
            <h1 className="text-lg font-semibold">Studio</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{email ?? "Unknown user"}</p>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Role: {role}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 pb-4">
          <Link className={navLinkClass} href="/studio">
            Dashboard
          </Link>
          <Link className={navLinkClass} href="/studio/drafts">
            Drafts
          </Link>
          <Link className={navLinkClass} href="/studio/ingestion">
            Ingestion
          </Link>
          <Link className={navLinkClass} href="/studio/registry">
            Registry
          </Link>
          <Link className={navLinkClass} href="/studio/export">
            Export
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
