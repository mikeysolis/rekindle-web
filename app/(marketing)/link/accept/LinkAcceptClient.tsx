"use client";

import { useEffect, useMemo } from "react";

type LinkAcceptClientProps = {
  scheme: string;
  token: string;
};

export default function LinkAcceptClient({
  scheme,
  token,
}: LinkAcceptClientProps) {
  const deepLink = useMemo(() => {
    if (!token) return `${scheme}://link/accept`;
    return `${scheme}://link/accept?t=${encodeURIComponent(token)}`;
  }, [scheme, token]);

  useEffect(() => {
    if (!token) return;

    const timer = window.setTimeout(() => {
      window.location.href = deepLink;
    }, 100);

    return () => window.clearTimeout(timer);
  }, [deepLink, token]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Open Rekindle</h1>
      <p style={{ marginTop: 0 }}>We&apos;re opening the app...</p>
      <p>If it doesn&apos;t open, you can:</p>
      <ul>
        <li>
          <a href={deepLink}>Open in app</a>
        </li>
        <li>
          <a href="https://userekindle.com">Get the app</a>
        </li>
      </ul>
    </main>
  );
}
