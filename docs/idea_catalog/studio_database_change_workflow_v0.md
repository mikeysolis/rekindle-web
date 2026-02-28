# Studio Database Change Workflow v0
_Last updated: 2026-02-24_

This document defines how Rekindle handles database migrations when:
- The **mobile app repo** is the source of truth for Supabase migrations, and
- The **Studio web app** needs schema changes, and
- We **do not** want Studio work blocked behind mobile release timelines.

---

## 1) Problem statement

- All Supabase migrations live in the **mobile app repo** today.
- Studio needs new tables for draft authoring (and later candidate inbox, publishing, etc.).
- Mobile has a release process (dev → release → staging → main → dev) that can be slower than Studio iteration.

We need a workflow where:
- DB migrations remain single-source-of-truth (avoid drift),
- Studio can ship DB-backed features quickly,
- Mobile is not forced to “finish first,” and
- Staging is stable.

---

## 2) Core strategy: decouple backend deployment from mobile release cadence

### 2.1 Treat the database as its own deployable component
Even if migrations live in the mobile repo, **deploying migrations** should be independent from:
- mobile release branch timelines
- mobile app build/test cycles

In practice:
- Backend changes can be merged and deployed to staging/prod without waiting for mobile “release branch” to finish.

### 2.2 Use backward-compatible “expand/contract” migrations
To avoid breaking mobile while Studio iterates:

**Expand phase (safe, additive)**
- Add new tables, columns, views, functions
- Keep old columns/behavior intact
- Make new columns nullable / defaulted
- Avoid renames, drops, or behavioral changes that break existing queries

**Contract phase (cleanup later)**
- After all clients (mobile + web) have migrated, remove deprecated columns/options
- Run cleanup migrations as a separate “contract” PR

This is the key that lets Studio move quickly without blocking on mobile.

---

## 3) Recommended repo organization options

### Option A (minimal change): keep migrations in mobile repo, but treat them as “db repo”
- Continue storing all migrations under `mobile-repo/supabase/…`
- Establish that changes under `supabase/migrations` can be merged independently from mobile feature release
- Add CI/CD that deploys migrations based on migration folder changes (see section 4)

### Option B (cleaner long-term): extract Supabase migrations into a dedicated `rekindle-db` repo
- New repo contains:
  - `supabase/migrations`
  - `supabase/seeds`
  - registry CSVs
  - scripts to generate types
- Mobile and Studio consume it via git submodule/subtree or monorepo workspace.

This decouples schema work from mobile app release entirely.

**Recommendation:** start with Option A for speed; plan Option B when convenient.

---

## 4) Branching + deployment workflow (Option A)

### 4.1 Add a “DB change” PR lane
When Studio needs a DB change:
1) Open a PR **against `dev`** in the mobile repo
2) The PR should contain **only database changes**:
   - SQL migration
   - seed updates if needed
   - any generated types if your repo commits them

Label PR: `db-change` (or similar).

### 4.2 Merge policy
- DB PRs can be merged into `dev` as soon as they pass checks.
- They should **not** wait for mobile feature completion.

### 4.3 Deployment policy
Deploy migrations independently:

- On merge to `dev`:
  - Auto-deploy migrations to **staging Supabase** (CI job)
- On merge to `main` (or manual approval gate):
  - Deploy migrations to **production Supabase**

This means staging always has the latest schema needed for Studio, even while mobile release work continues.

### 4.4 How does this fit with your existing mobile release branches?
Your mobile process uses a `release/*` branch for staging validation.

To avoid waiting for mobile release work:
- The backend **staging schema** should track `dev` (or a dedicated `backend-dev` branch), not `release/*`.

The mobile release branch should be **compatible** with the staging schema via expand/contract discipline.
If a DB change is not backward compatible, it must be coordinated and delayed.

---

## 5) How Studio consumes schema changes safely

### 5.1 When Studio needs new tables
Example for Steps 1–3A:
- `studio_users`
- `idea_drafts`
- `idea_draft_traits`

These are additive and should not affect mobile, so they are safe to deploy early.

### 5.2 Studio dev workflow
- Studio connects to staging or local Supabase in dev.
- After migrations deploy to staging, Studio can start using them immediately.

### 5.3 Type generation
Each client repo can regenerate Supabase types:
- Studio repo generates its own `types.gen.ts`
- Mobile repo already has its own

This avoids cross-repo coupling on generated types.

---

## 6) Operational guardrails

### 6.1 Backward compatibility checklist (required for every db-change PR)
- No renames/drops of columns used by production mobile
- New columns are nullable or have defaults
- New tables do not change existing RLS policies unexpectedly
- Views/RPC changes are versioned or non-breaking

### 6.2 Staging environment discipline
If both mobile and studio share a staging Supabase project:
- only merge backward compatible migrations into `dev`
- otherwise create separate staging projects (more complex/costly)

---

## 7) Minimal CI/CD suggestion (high-level)
Add a CI workflow triggered on changes in:
- `supabase/migrations/**`
- `supabase/seeds/**`

Jobs:
- Validate SQL formatting (optional)
- Spin up local Supabase and apply migrations (smoke test)
- Deploy migrations to staging (on merge to dev)
- Deploy migrations to prod (on merge to main with approval)

---

## 8) Decision summary (for now)
- Keep migrations in one place (mobile repo) to avoid drift.
- Treat DB changes as their own lane, merged and deployed independently from mobile feature releases.
- Use expand/contract to prevent breaking mobile while Studio iterates.
- Studio starts with staging tables and export-only pipeline, so production catalog is unaffected.
