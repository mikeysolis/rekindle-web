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
- attempt to open the app using the variant-specific deep link scheme
- show a fallback page with a manual “Open in app” link

If this page is missing, the OS considers the link invalid and app links won’t work.

Expected scheme mapping:

| Host | App scheme |
| --- | --- |
| `dev.userekindle.com` | `rekindle-dev://` |
| `staging.userekindle.com` | `rekindle-staging://` |
| `userekindle.com` | `rekindle://` |
| `www.userekindle.com` | `rekindle://` |

For preview or non-canonical hosts, set `REKINDLE_LINK_SCHEME` to one of
`rekindle-dev`, `rekindle-staging`, or `rekindle`. If that env var is not
set, the route falls back to `WELL_KNOWN_VARIANT` and then production.

---

## 2) Sample NextJS Page (App Router)

Create:

```
app/link/accept/page.tsx
```

```tsx
import LinkAcceptClient from './LinkAcceptClient'
import { headers } from 'next/headers'

const hostSchemeMap = new Map([
  ['dev.userekindle.com', 'rekindle-dev'],
  ['staging.userekindle.com', 'rekindle-staging'],
  ['userekindle.com', 'rekindle'],
  ['www.userekindle.com', 'rekindle'],
])

function resolveEnvScheme(): string {
  if (process.env.REKINDLE_LINK_SCHEME) {
    return process.env.REKINDLE_LINK_SCHEME
  }

  if (process.env.WELL_KNOWN_VARIANT === 'dev') return 'rekindle-dev'
  if (process.env.WELL_KNOWN_VARIANT === 'staging') return 'rekindle-staging'

  return 'rekindle'
}

export default async function LinkAcceptPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string }>
}) {
  const host = ((await headers()).get('host') ?? '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
  const scheme = hostSchemeMap.get(host) ?? resolveEnvScheme()
  const params = (await searchParams) ?? {}

  return <LinkAcceptClient scheme={scheme} token={params.t ?? ''} />
}
```

Notes:
- This is **redirect-only** and intentionally simple.
- iOS/Android will open the app directly if universal links are set up.
- The manual fallback must use the matching scheme for the current host:
  `rekindle-dev://`, `rekindle-staging://`, or `rekindle://`.

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
https://staging.userekindle.com/link/accept?t=TESTTOKEN
https://userekindle.com/link/accept?t=TESTTOKEN
```

Each URL should not 404. If the matching app build is installed, the OS
should open it. Otherwise, the fallback page should display and its
manual “Open in app” link should use the matching app scheme.
