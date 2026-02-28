# Rekindle Studio MVP Implementation Spec v0
_Last updated: 2026-02-24_

This document is written for **Codex App** to implement the initial Rekindle Studio in a **measured, vertical-slice** way so we can start using it **soon** for catalog Idea generation.

## Scope (implement now)
This spec covers **Step 1, Step 2, and Step 3A** only:

- **Step 1 — Foundation (connect + protect)**
  - Supabase connection + auth
  - Route protection and Studio access control
  - Registry viewer (read-only) to debug vocabulary / bindings

- **Step 2 — Draft Idea Editor (create + tag)**
  - Draft Idea CRUD
  - Tagging UI driven by `trait_bindings` + `trait_options`
  - Publish-gate readiness indicator (Tier 1 + base fields)

- **Step 3A — Export-only pipeline**
  - Export publishable drafts to CSV (import-ready shape)
  - No direct publishing into production catalog tables yet

## Non-goals (do later)
- Candidate inbox (wish reuse + user submissions)
- Dedupe / merge workflows
- Coverage dashboards (beyond minimal counts)
- Direct publish into production catalog tables (`ideas`, `idea_traits`)
- Rewards + attribution

---

## 1) High-level architecture

### 1.1 Single NextJS app: Marketing + Studio
This NextJS project hosts:
- Marketing site (public) — routes under `/` and other public marketing paths
- Studio (protected) — routes under `/studio/*`

**Requirement:** Marketing site must stay public and fast; Studio must be protected and admin-only.

### 1.2 Route grouping (recommended)
Use Next.js App Router route groups:

- `app/(marketing)/...` for marketing pages
- `app/(studio)/studio/...` for Studio pages

Benefits:
- separate layouts, CSS, and auth gating
- marketing unaffected by Studio code

### 1.3 Data sources
Studio reads:
- `trait_types`, `trait_options`, `trait_bindings` (registry)
- draft tables created for Studio (see section 4)

Studio does **not** need the mobile app codebase.

---

## 2) Environment configuration

### 2.1 Required env vars
Set up `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (recommended later):
- `SUPABASE_SERVICE_ROLE_KEY` (server-only) — **do not expose to client**
  - Not required for Steps 1–3A if RLS is set up correctly and Studio users have access.

### 2.2 Local dev
Studio must support local Supabase for development.

---

## 3) Authentication + access control

### 3.1 Auth provider
Use Supabase Auth.

**MVP rule:** only allow authenticated users who are explicitly whitelisted as Studio editors/admins.

### 3.2 Studio access model
Create a small Studio-only table in Supabase:

- `studio_users` with:
  - `user_id` (uuid, FK → auth.users.id)
  - `role` (`admin` | `editor` | `viewer`)
  - `created_at`

Studio should treat this as the source of truth for Studio access.

### 3.3 Route protection behavior
All `/studio/*` routes must be protected, except `/studio/login`.

Recommended UX:
- unauthenticated → redirect to `/studio/login`
- authenticated but not in `studio_users` → show “Access not granted” page

### 3.4 Implementation approach (suggested)
- Use a server-side auth check in the Studio layout or middleware
- Add a tiny helper: `getStudioUserOrNull()`

---

## 4) Database requirements (new tables for Steps 1–3A)

> Migrations are maintained in the **mobile app repo**, not here.  
> See `studio_database_change_workflow_v0.md` for the process.

### 4.1 Tables

#### 4.1.1 `studio_users`
See section 3.2.

#### 4.1.2 `idea_drafts`
A staging entity for draft authoring.

Fields (minimum):
- `id` uuid pk
- `title` text
- `reason_snippet` text
- `description` text
- `steps` text (optional; store as delimited string for now)
- `what_you_need` text (optional)
- `tips_or_variations` text (optional)
- `safety_or_boundaries_note` text (optional)
- `min_minutes` int
- `max_minutes` int
- `active` boolean default true
- `status` text enum-like (`draft` | `review` | `publishable` | `exported`)
- `source_url` text (optional)
- `editorial_note` text (optional)
- `created_by` uuid (FK → auth.users.id)
- `updated_by` uuid (FK → auth.users.id)
- `created_at`, `updated_at` timestamps

#### 4.1.3 `idea_draft_traits`
Join table between drafts and trait options.

Fields:
- `id` uuid pk
- `draft_id` uuid FK → `idea_drafts.id`
- `trait_type_id` uuid FK → `trait_types.id`
- `trait_option_id` uuid FK → `trait_options.id`
- `select_mode` text (`single` | `multi`)  *(store for debugging; truth comes from bindings)*
- `created_at`

Constraints:
- Unique: (`draft_id`, `trait_type_id`, `trait_option_id`)
- (Optional) Unique for single-select: enforce at most 1 option per trait_type per draft.
  - Can be enforced in app logic first; DB constraint later.

### 4.2 RLS policies (MVP)
- `studio_users`: only admins can manage; editors/viewers can read self.
- `idea_drafts`:
  - editors/admins can create/update
  - viewers read-only
- `idea_draft_traits`:
  - same as drafts

**Simple MVP rule:** all Studio users can read all drafts; only editors/admins can write.

---

## 5) Step 1 — Foundation implementation (connect + protect)

### 5.1 Pages

#### 5.1.1 `/studio/login`
- Email/password sign-in (MVP)
- After sign-in, redirect to `/studio`

#### 5.1.2 `/studio`
- A minimal dashboard page with links:
  - “Drafts”
  - “Registry”
  - “Export”

#### 5.1.3 `/studio/registry` (read-only)
Purpose: debugging and ensuring Studio uses canonical vocabulary.
Show:
- trait types list
- trait options list (filter by type)
- trait bindings list (filter `context=idea`)

**MVP:** a searchable table view is enough.

### 5.2 Components / helpers
- `supabaseClient.ts` (browser)
- `supabaseServer.ts` (server)
- `requireStudioUser()` guard

### 5.3 Acceptance criteria (Step 1)
- Marketing pages are public and unaffected.
- `/studio/*` requires auth.
- A user not in `studio_users` cannot access `/studio/*`.
- Registry viewer renders and can filter/search.

---

## 6) Step 2 — Draft Idea Editor (create + tag + gate)

### 6.1 Pages

#### 6.1.1 `/studio/drafts`
List drafts with:
- title
- status
- updated_at
- “publish gate” indicator:
  - ✅ Publishable / ❌ Missing fields or tags

Actions:
- New Draft
- Edit Draft

#### 6.1.2 `/studio/drafts/new`
Create draft (initially blank, status=draft).

#### 6.1.3 `/studio/drafts/[id]`
Edit draft:
- base content fields
- tagging UI
- publish gate status panel

### 6.2 Tagging UI (registry-driven)

#### 6.2.1 Load bindings
Query bindings for context `idea`.

Use bindings to drive:
- select mode (`single` vs `multi`)
- required vs optional
- min_required for multi-select
- tier (Tier 1 / 2 / 3)
- UI grouping / ordering (if present)

#### 6.2.2 Rendering pattern
For each trait type in bindings:
- render a “tag picker”
- options come from `trait_options` for that `trait_type_id`
- show option label (from translations)

Select modes:
- single → radio-like or single-select chips
- multi → chip multi-select

### 6.3 Publish gate evaluation (in UI)
A draft is “publishable” if:

**Base fields are present**
- title, reason_snippet, description
- min_minutes, max_minutes (and min ≤ max)
- effort (Tier 1 trait; see below)

**Tier 1 trait requirements satisfied**
For each binding with `tier=1` and `is_required=true`:
- single: at least 1 selected
- multi: at least `min_required` selected

Show:
- Missing base fields list
- Missing trait types list

### 6.4 Save behavior
- Autosave is optional.
- MVP: explicit Save button is fine.
- Draft can be saved incomplete.

### 6.5 Status transitions (MVP)
- `draft` → `review` (manual)
- `review` → `publishable` only if gate passes
- `publishable` → `exported` during export step (Step 3A)

### 6.6 Acceptance criteria (Step 2)
- Can create and edit drafts.
- Can attach traits using registry-driven UI.
- Publish gate panel correctly shows readiness.
- Can set status to publishable only if gate passes.

---

## 7) Step 3A — Export publishable drafts to CSV (no direct publish)

### 7.1 Export behavior
Export all drafts where:
- `status = publishable`
- and publish gate passes (re-check server-side)

Output:
- CSV with canonical columns matching the bulk import schema used by the future importer.

### 7.2 Export endpoint
Implement a server route handler:

- `GET /studio/api/export/publishable.csv`
  - Auth required (studio_user role must be editor/admin)
  - Returns `text/csv`
  - Uses a safe CSV writer (escape quotes, commas)

### 7.3 Export format (minimum columns)
Use these columns (in this order):

- `title`
- `reason_snippet`
- `description`
- `steps`
- `what_you_need`
- `tips_or_variations`
- `safety_or_boundaries_note`
- `min_minutes`
- `max_minutes`
- `effort_slug`
- `active`
- `cost_tier_slug`
- `coordination_level_slug`
- `presence_requirement_slug`
- `idea_format_slugs`
- `relationship_type_fit_slugs`
- `goal_slugs`
- `context_slugs`
- `idea_category_slugs`
- `time_bucket_slug`
- `surprise_style_slug`
- `energy_vibe_slug`
- `social_setting_slugs`
- `age_band_fit_slugs`
- `event_tag_slugs`
- `idea_collection_slugs`
- `cadence_tag_slugs`
- `physical_intensity_slug`
- `accessibility_flag_slugs`
- `weather_dependence_slugs`
- `gender_fit_slugs`
- `status`
- `editorial_note`
- `source`

Where each `*_slugs` field is a comma-separated list of **option_slug** values.

### 7.4 How to generate trait slugs in export
For each draft:
- query associated `idea_draft_traits`
- join with `trait_types.slug` + `trait_options.slug`
- map into the export columns using the same mapping as the importer spec:
  - `effort_slug` comes from trait type `effort`, etc.

### 7.5 Post-export update
After successfully exporting:
- Option A: do nothing (repeat exports allowed)
- Option B (recommended): update exported drafts to `status=exported` and set `exported_at`.

For MVP, Option A is acceptable; Option B prevents accidental duplicates.

### 7.6 Acceptance criteria (Step 3A)
- Can download a CSV of publishable drafts.
- CSV includes correct trait slugs and required columns.
- Export is protected behind Studio auth.
- Export does not mutate production catalog tables.

---

## 8) Testing + QA checklist (MVP)

### 8.1 Manual QA
- Login works
- Unauthorized users blocked
- Draft create/edit works
- Tag selections persist
- Publish gate blocks incomplete publishable status
- Export downloads valid CSV

### 8.2 Automated tests (minimal)
- Pure function unit test: publish gate evaluator
- Pure function unit test: draft → CSV row mapping

---

## 9) “Done” definition for this milestone
We are “done” with Steps 1–3A when we can:
1) Research ideas (externally)
2) Enter them into Studio as drafts
3) Tag them accurately using the registry
4) Export publishable ideas to CSV for import later
