# Linking Web Setup (NextJS Redirect-Only)

This guide is for the **NextJS (Vercel)** project that hosts:
`userekindle.com`, `staging.userekindle.com`, and `dev.userekindle.com`.

Goal: ensure `/link/accept?t=...` **never 404s**, so universal/app links work and users
see a fallback page when the app is not installed.

---

## 1) Required Web Route

Create a route at:

```
/link/accept
```

This page should:
- read `t` (invite token) from the query string
- attempt to open the app (deep link)
- show a fallback page with a manual “Open in app” link

If this page is missing, the OS considers the link invalid and app links won’t work.

---

## 2) Sample NextJS Page (App Router)

Create:

```
app/link/accept/page.tsx
```

```tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function LinkAccept() {
  const params = useSearchParams()
  const token = params.get('t') ?? ''

  useEffect(() => {
    if (!token) return
    // OS will open app automatically when universal links are configured.
    // This effect is just a placeholder; no redirect needed.
  }, [token])

  return (
    <main style={{ padding: 24 }}>
      <h1>Open Rekindle</h1>
      <p>We’re opening the app…</p>
      <p>If it doesn’t open, you can:</p>
      <ul>
        <li>
          <a
            href={`rekindle://link/accept?t=${encodeURIComponent(token)}`}
          >
            Open in app
          </a>
        </li>
        <li>
          <a href="https://userekindle.com">Get the app</a>
        </li>
      </ul>
    </main>
  )
}
```

Notes:
- This is **redirect-only** and intentionally simple.
- iOS/Android will open the app directly if universal links are set up.
- The manual `rekindle://` fallback still works on devices with the app installed.

---

## 3) Well-Known Files (already prepared)

We maintain these files in the Rekindle repo:

```
web/prod/.well-known/
web/staging/.well-known/
web/dev/.well-known/
```

Copy the `.well-known` folder for each environment into the NextJS project’s:

```
public/.well-known/
```

Example:
- prod → `https://userekindle.com/.well-known/`
- staging → `https://staging.userekindle.com/.well-known/`
- dev → `https://dev.userekindle.com/.well-known/`

---

## 4) Quick Checks

Verify these URLs return **200 + JSON**:

```
https://dev.userekindle.com/.well-known/apple-app-site-association
https://dev.userekindle.com/.well-known/assetlinks.json
```

Then test:

```
https://dev.userekindle.com/link/accept?t=TESTTOKEN
```

It should not 404. If the app is installed, the OS should open it. Otherwise,
the fallback page should display.
