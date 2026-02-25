# Rekindle Studio MVP Detailed Implementation Plan (Steps 1-2-3A) v0
_Last updated: 2026-02-25_

## 1) Purpose
Create an interruption-safe, implementation-level plan for the first usable Studio milestone:
- Step 1: Foundation (Supabase auth, route protection, registry viewer)
- Step 2: Draft Idea editor (create/edit/tag + publish-gate readiness)
- Step 3A: Export-only pipeline (publishable drafts -> CSV)

This plan is optimized for:
- data correctness over UI polish,
- clear extension points for later Studio modules,
- minimal churn if work resumes in a new chat.

---

## 2) Scope and non-goals

### In scope (this plan)
- Protected `/studio/*` area with role-based access via `studio_users`.
- Draft CRUD on `idea_drafts` + tag assignments on `idea_draft_traits`.
- Trait-binding-driven tagging UI for `context=idea`.
- Publish-gate evaluation in UI and server-side export re-check.
- CSV export in canonical bulk-import column shape.

### Out of scope (defer)
- Candidate inbox, dedupe/merge workflows, rewards, coverage dashboards.
- Direct writes to production catalog tables (`ideas`, `idea_traits`).
- Advanced autosave/collaboration UX.

---

## 3) Current repo baseline (2026-02-25)
- Minimal Next.js App Router app with public home page and deep-link page.
- No Supabase dependencies or auth integration yet.
- No Studio route group or server-side role guard.
- No test harness for unit tests yet.

Implication: Step 1 starts from clean slate and should establish structure that Step 2/3A can reuse.

---

## 4) External dependencies and prerequisites

## 4.1 Required DB objects (managed in mobile repo migrations)
Studio implementation in this repo should begin only after these exist in Supabase staging/local:
- `studio_users` (`user_id`, `role`, timestamps)
- `idea_drafts` (base editorial fields + status + created/updated metadata)
- `idea_draft_traits` (draft-to-trait option joins)
- Existing registry tables available:
  - `trait_types`
  - `trait_options`
  - `trait_bindings`

## 4.2 RLS prerequisites
Minimum policy behavior required:
- `studio_users`: authenticated Studio users can read own row; admins can manage.
- `idea_drafts` + `idea_draft_traits`: viewers read-only, editors/admins write.
- Registry tables readable for Studio users.

## 4.3 Environment variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional later:
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, not used for MVP steps unless needed for internal jobs).

## 4.4 Package dependencies
Add:
- `@supabase/supabase-js`
- `@supabase/ssr`
- `zod` (already present in lockfile tree but should be explicit direct dep if used for input guards)

---

## 5) Architecture decisions (for Steps 1-3A)

## 5.1 Route partitioning
Use App Router route groups:
- `app/(marketing)/...` for public pages.
- `app/(studio)/studio/...` for protected Studio routes.

Reason: keeps marketing unaffected while Studio grows.

## 5.2 Auth and access model
- Supabase Auth for identity.
- `studio_users` as Studio access allowlist and role source (`admin|editor|viewer`).
- `requireStudioUser()` guard in server context for Studio pages/endpoints.

## 5.3 Data access pattern
- Server-first reads in page/server components.
- Mutations via server actions or route handlers, each validating input.
- Shared domain helpers in `lib/studio/*` to avoid page-level query duplication.

## 5.4 Tagging model
- Render tag UI strictly from `trait_bindings` where `context='idea'`.
- Never hard-code trait requirement rules in components.
- Trait binding metadata drives required/min/select mode/tier.

## 5.5 Export model
- CSV export is server-side only.
- Export endpoint re-runs publish-gate checks (do not trust client state).
- Export does not mutate production catalog tables.

---

## 6) Planned file/module blueprint

## 6.1 Supabase + auth foundation
- `lib/database/browser.ts`
- `lib/database/server.ts`
- `lib/database/middleware.ts` (if proxy refresh helper needed)
- `middleware.ts` (protect `/studio/*`, allow `/studio/login`)
- `lib/studio/auth.ts` (`getStudioUserOrNull`, `requireStudioUser`, role checks)

## 6.2 Studio domain helpers
- `lib/studio/registry.ts` (trait types/options/bindings queries + shaping)
- `lib/studio/publish-gate.ts` (pure evaluator used by UI + export)
- `lib/studio/drafts.ts` (draft CRUD and trait sync helpers)
- `lib/studio/export.ts` (draft-to-CSV mapping + CSV serialization)

## 6.3 Studio routes/pages
- `app/(studio)/studio/login/page.tsx`
- `app/(studio)/studio/page.tsx`
- `app/(studio)/studio/access-denied/page.tsx`
- `app/(studio)/studio/registry/page.tsx`
- `app/(studio)/studio/drafts/page.tsx`
- `app/(studio)/studio/drafts/new/page.tsx`
- `app/(studio)/studio/drafts/[id]/page.tsx`
- `app/(studio)/studio/export/page.tsx` (simple page with download action)
- `app/(studio)/studio/api/export/publishable.csv/route.ts`

## 6.4 Shared UI components (minimal functional UI)
- `components/studio/StudioShell.tsx`
- `components/studio/DraftForm.tsx`
- `components/studio/TraitPicker.tsx`
- `components/studio/PublishGatePanel.tsx`
- `components/studio/RegistryTable.tsx`

---

## 7) Detailed execution plan

## Phase 0: Project prep and scaffolding

- [ ] `P0.1` Install dependencies and verify app boots.
  - `npm i @supabase/supabase-js @supabase/ssr zod`
  - `npm run dev` starts without runtime errors.

- [ ] `P0.2` Reorganize routes into marketing/studio groups without changing public URLs.
  - Move current public pages to `(marketing)` group.
  - Keep `/link/accept` behavior unchanged.

- [ ] `P0.3` Add `.env.example` documenting required Studio env vars.

- [ ] `P0.4` Add placeholder Studio nav shell and layout.
  - Keep styling intentionally simple and readable.

Exit criteria:
- Public routes still work.
- Project compiles with new route groups and no Studio runtime code yet.

---

## Phase 1: Step 1 foundation (connect + protect + registry viewer)

- [ ] `S1.1` Implement Supabase client helpers.
  - Browser client for client components/actions.
  - Server client for server components/route handlers.
  - Ensure cookie/session support aligns with App Router.

- [ ] `S1.2` Implement Studio route protection.
  - Protect `/studio/*` except `/studio/login`.
  - Redirect unauthenticated users to login.
  - Redirect authenticated non-allowlisted users to access-denied page.

- [ ] `S1.3` Implement Studio auth helper layer.
  - `getStudioUserOrNull()` fetches role row from `studio_users`.
  - `requireStudioUser({ minRole? })` throws/redirects consistently.
  - Add small role utility for `viewer/editor/admin`.

- [ ] `S1.4` Build `/studio/login`.
  - Email/password sign-in form (MVP).
  - Successful sign-in -> `/studio`.
  - Existing session -> auto-redirect to `/studio`.

- [ ] `S1.5` Build `/studio` dashboard.
  - Display current auth identity + Studio role.
  - Link cards: Drafts, Registry, Export.

- [ ] `S1.6` Build `/studio/registry` read-only viewer.
  - Load trait types/options/bindings.
  - Filters: by trait type, by binding context (`idea` default), text search.
  - For missing labels, fallback to slug.

- [ ] `S1.7` Manual QA pass for Step 1.
  - Auth flow and guard behavior.
  - Non-allowlisted access denied behavior.
  - Registry page data loaded and filterable.

Step 1 acceptance criteria:
- Marketing routes are public and unaffected.
- `/studio/*` is protected with whitelist role checks.
- Registry viewer confirms Studio is bound to canonical vocabulary/bindings.

---

## Phase 2: Step 2 draft editor (create + tag + gate)

- [ ] `S2.1` Implement data contracts and query helpers for drafts.
  - Draft read/write helpers in `lib/studio/drafts.ts`.
  - Trait assignment sync helper for single/multi bindings.
  - Input validation with `zod` for draft base fields and trait payloads.

- [ ] `S2.2` Build `/studio/drafts` list page.
  - Columns: title, status, updated_at, publishability indicator.
  - Actions: create new draft, open draft, optional quick status badge filters.

- [ ] `S2.3` Build `/studio/drafts/new`.
  - Create blank draft row (`status='draft'`, `active=true`) and redirect to edit page.
  - Preserve creator/updater metadata.

- [ ] `S2.4` Build `/studio/drafts/[id]` editor page.
  - Base fields section:
    - `title`, `reason_snippet`, `description`
    - `steps`, `what_you_need`, `tips_or_variations`, `safety_or_boundaries_note`
    - `min_minutes`, `max_minutes`, `active`, `editorial_note`, `source_url`
  - Tagging section:
    - Render by `trait_bindings` for `context='idea'`
    - Respect `select_mode`, `is_required`, `min_required`, `tier`, ordering metadata.

- [ ] `S2.5` Implement publish-gate evaluator as shared pure function.
  - Base field checks:
    - required text fields present
    - minutes numeric and `min <= max`
  - Tier 1 checks from bindings:
    - required single has selection
    - required multi meets `min_required` (default to 1)
  - Output:
    - `isPublishable`
    - `missingBaseFields[]`
    - `missingTraitTypeSlugs[]`
    - `warnings[]` (optional)

- [ ] `S2.6` Enforce status transitions.
  - Allowed:
    - `draft -> review`
    - `review -> publishable` only if gate passes
    - `publishable -> draft/review` allowed for edits
  - Block invalid transitions server-side, not only UI-side.

- [ ] `S2.7` Add minimal tests for Step 2 core logic.
  - Unit test publish-gate evaluator.
  - Unit test trait assignment reducer/sync helper.

- [ ] `S2.8` Manual QA for Step 2.
  - Draft create/edit/save flows.
  - Trait selection persistence across refresh.
  - Publish-gate panel correctness on known incomplete and complete examples.

Step 2 acceptance criteria:
- Drafts can be created and edited.
- Tagging UI is binding-driven and persists selections.
- Publishable status cannot be set when gate fails.

---

## Phase 3: Step 3A export-only pipeline

- [ ] `S3A.1` Implement canonical export mapping constants.
  - One source of truth: trait type slug -> CSV column name.
  - Include Tier 1/2/3 fields from import spec.

- [ ] `S3A.2` Build draft-to-export-row transformer.
  - Inputs:
    - draft base fields
    - associated trait selections resolved as `trait_type_slug` + `option_slug`
  - Output:
    - one CSV row with required ordered columns.
  - Ensure list columns serialize as comma-separated slugs.

- [ ] `S3A.3` Implement server-side export gate re-check.
  - Query drafts with `status='publishable'`.
  - Re-run publish-gate evaluator before inclusion.
  - Exclude invalid rows and emit server logs/warnings for mismatch.

- [ ] `S3A.4` Implement CSV route handler.
  - `GET /studio/api/export/publishable.csv`
  - Auth: editor/admin only
  - Response headers:
    - `content-type: text/csv; charset=utf-8`
    - `content-disposition: attachment; filename="idea-drafts-publishable-YYYYMMDD-HHMM.csv"`
  - Correct CSV escaping for commas/quotes/newlines.

- [ ] `S3A.5` Build `/studio/export` page.
  - Show publishable draft count.
  - Download link/button to export endpoint.
  - Optional preview of first N rows (for quick sanity checks).

- [ ] `S3A.6` Add minimal tests for export mapping.
  - Unit test row mapping from synthetic draft+traits.
  - Unit test CSV escaping behavior.

- [ ] `S3A.7` Manual QA for export.
  - Download file opens in spreadsheet with expected columns.
  - `*_slugs` values map correctly from selected trait options.
  - No writes to production catalog tables.

Step 3A acceptance criteria:
- Authorized user can download import-ready CSV for publishable drafts.
- Export enforces server-side publish-gate checks.
- Export does not publish directly into production catalog tables.

---

## 8) Data contracts for implementation

## 8.1 Publish-gate required base fields
- `title`
- `reason_snippet`
- `description`
- `min_minutes`
- `max_minutes` with `min_minutes <= max_minutes`

## 8.2 Tier 1 trait requirements (from bindings)
Do not hard-code trait list in logic. Use bindings where:
- `context = idea`
- `tier = 1`
- `is_required = true`

Evaluate by binding `select_mode`:
- `single`: at least one selected option.
- `multi`: selected count >= `min_required` (default `1` if null).

## 8.3 Canonical export trait-column mapping
- `effort` -> `effort_slug`
- `time_bucket` -> `time_bucket_slug`
- `cost_tier` -> `cost_tier_slug`
- `coordination_level` -> `coordination_level_slug`
- `presence_requirement` -> `presence_requirement_slug`
- `idea_format` -> `idea_format_slugs`
- `person_type` -> `relationship_type_fit_slugs`
- `goal` -> `goal_slugs`
- `context` -> `context_slugs`
- `idea_category` -> `idea_category_slugs`
- `surprise_style` -> `surprise_style_slug`
- `energy_vibe` -> `energy_vibe_slug`
- `social_setting` -> `social_setting_slugs`
- `age_band` -> `age_band_fit_slugs`
- `event_tag` -> `event_tag_slugs`
- `idea_collection` -> `idea_collection_slugs`
- `cadence_tag` -> `cadence_tag_slugs`
- `physical_intensity` -> `physical_intensity_slug`
- `accessibility_flag` -> `accessibility_flag_slugs`
- `weather_dependence` -> `weather_dependence_slugs`
- `person_gender` -> `gender_fit_slugs`

---

## 9) QA and verification checklist

## 9.1 Functional smoke checks
- [ ] Public home page works unauthenticated.
- [ ] `/link/accept?t=...` still works and does not 404.
- [ ] `/studio` redirects to login if signed out.
- [ ] Signed-in non-allowlisted user is denied.
- [ ] Signed-in allowlisted editor sees dashboard/registry/drafts/export.
- [ ] Draft can be created, edited, tagged, saved.
- [ ] Gate panel reflects real missing requirements.
- [ ] Export downloads valid CSV with expected columns and slugs.

## 9.2 Engineering checks
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Added unit tests pass (once test runner added/configured).

---

## 10) Risks and mitigations

1) Unknown exact `trait_bindings` schema fields.
- Mitigation: build adapter layer in `lib/studio/registry.ts` that normalizes DB rows to internal shape and keeps UI logic stable.

2) RLS policy mismatches blocking Studio writes.
- Mitigation: validate with staging/local seed accounts early in Step 1 before building full UI.

3) Export drift from importer expectations.
- Mitigation: keep single shared mapping table and column order constants aligned to `idea-catalog_bulk-import-mapping_spec_v0.md`.

4) Duplicate exports and workflow confusion.
- Mitigation: keep explicit status semantics (`publishable` vs `exported`) and optionally add post-export status update in next iteration.

---

## 11) Interruption-safe resume protocol

If work is interrupted, resume with this sequence:

1) Open this plan and mark completed checkboxes.
2) Confirm DB prerequisites are present in staging/local.
3) Run:
   - `npm install`
   - `npm run dev`
4) Continue from the first unchecked item in current phase.
5) After each completed phase:
   - run lint/build,
   - update this doc with completion notes and date.

Recommended commit granularity:
- Commit per major phase (`P0`, `S1`, `S2`, `S3A`) to simplify rollback/review.

---

## 12) Progress log (update as work proceeds)
- 2026-02-25: Initial detailed plan created.
