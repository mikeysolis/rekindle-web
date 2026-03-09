# Rekindle Studio Catalog Intake Implementation Plan v0

**Status:** Final implementation plan  
**Audience:** internal devs / product  
**Purpose:** define the implementation order and explicit decisions for:

- adding the new Studio `Catalog Intake` review surface
- allowing Studio to run without the separate scraped-ingestion DB

## Canonical Sources

The implementation must follow these as the source of truth:

- `db/docs/studio_catalog_intake_contract.md`
- `db/supabase/migrations/0048_studio_catalog_intake.sql`
- `lib/database/types.gen.ts`

If older docs disagree, these are authoritative.

## Locked Decisions

### 1) Catalog intake is a separate Studio workflow

It must not reuse:

- `ingest_*`
- `lib/studio/ingestion.ts`
- `idea_drafts.ingest_candidate_id`
- the separate ingestion Supabase project

It must use:

- `catalog_import_*`
- `idea_drafts.catalog_import_candidate_id`
- the main app DB client

### 2) Studio must boot without ingestion DB env

The standard Studio runtime will require only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Scraped-ingestion env vars become optional for Studio runtime and remain required only for:

- pipeline commands
- pipeline reconciliation
- explicitly enabled scraped-ingestion UI

### 3) Dormant scraped-ingestion UI stays in the repo but is not a default Studio feature

When ingestion env is absent:

- hide `Ingestion` from Studio nav
- hide `Ingestion` from Studio dashboard
- keep the old route code in the repo
- direct visits to `/studio/ingestion` and `/studio/ingestion/[id]` should render an explicit unavailable state instead of crashing

When ingestion env is present:

- existing ingestion UI remains available

### 4) Catalog cluster review is global

The route:

- `/studio/catalog-intake/clusters/[clusterId]`

will show all candidates in the cluster across all batches, not only the originating batch.

Batch detail pages will link into that global cluster detail.

### 5) Unclustered candidates are acknowledged but not fully managed in v1

If a batch contains candidates with `cluster_id is null`:

- show an `Unclustered candidates` count on batch detail
- do not build a dedicated unclustered review workflow in v1

This prevents silent data loss in the UI while keeping scope thin.

### 6) Catalog-intake decision history is out of scope for v1 UI

`catalog_import_decisions` remains an important audit table, but v1 will not build a dedicated decision-history panel unless it becomes necessary during implementation.

The v1 UI will rely on:

- current candidate state
- current cluster state
- linked draft visibility

### 7) Reject reason codes are web-owned constants in v1

Because the DB RPC only enforces non-empty `reason_code`, the Studio web layer will define and enforce a fixed allowed set:

- `duplicate_existing_candidate`
- `duplicate_existing_draft`
- `duplicate_existing_idea`
- `too_similar_to_stronger_variant`
- `too_specific_or_one_time`
- `unclear_or_confusing`
- `awkward_generated_wording`
- `low_value`
- `off_method`

### 8) Promotion remains intentionally thin

`catalog_import_promote_candidate_to_draft` is the full promotion authority.

Web code will not recreate promotion logic. The expected result of promotion is:

- create or reuse one draft
- set `catalog_import_candidate_id`
- carry title and provenance note
- redirect into existing draft editing flow

No trait-prefill or full authoring automation is required for v1.

## Scope

## Included

- Studio nav and dashboard entry for `Catalog Intake`
- a new adapter module: `lib/studio/catalog-intake.ts`
- batch list page
- batch detail page
- cluster detail page
- server actions for:
  - set preferred candidate
  - set candidate alternate
  - mark candidate needs rewrite
  - reject candidate
  - promote candidate to draft
- runtime/env decoupling so Studio can run without ingestion DB
- conditional visibility for old scraped-ingestion UI

## Excluded

- reuse or extension of scraped-source `ingest_*`
- source governance or ingestion analytics
- catalog-intake upload/import UI
- decision-history UI
- full unclustered review workflow
- trait-prefill beyond what DB promotion already does
- direct publish from catalog intake to `ideas`

## Target Routes

- `/studio/catalog-intake`
- `/studio/catalog-intake/[batchId]`
- `/studio/catalog-intake/clusters/[clusterId]`

Existing routes remain:

- `/studio`
- `/studio/drafts`
- `/studio/export`
- `/studio/registry`
- `/studio/ingestion` when ingestion is configured

## Target Files

### New

- `app/(studio)/studio/catalog-intake/page.tsx`
- `app/(studio)/studio/catalog-intake/[batchId]/page.tsx`
- `app/(studio)/studio/catalog-intake/clusters/[clusterId]/page.tsx`
- `lib/studio/catalog-intake.ts`

### Likely new shared components

- `components/studio/catalog-intake/BatchTable.tsx`
- `components/studio/catalog-intake/ClusterTable.tsx`
- `components/studio/catalog-intake/CandidateList.tsx`

### Updated

- `components/studio/StudioShell.tsx`
- `app/(studio)/studio/page.tsx`
- `app/(studio)/studio/ingestion/page.tsx`
- `app/(studio)/studio/ingestion/[id]/page.tsx`
- `scripts/validate-env.mjs`
- `lib/ingestion/env.ts`
- `README.md`

## Adapter Contract

`lib/studio/catalog-intake.ts` is the only DB boundary for this feature.

It should expose:

- `listCatalogImportBatches()`
- `getCatalogImportBatch(batchId)`
- `listCatalogImportBatchClusters(batchId)`
- `getCatalogImportCluster(clusterId)`
- `setCatalogImportPreferredCandidate(input)`
- `setCatalogImportCandidateAlternate(input)`
- `markCatalogImportCandidateNeedsRewrite(input)`
- `rejectCatalogImportCandidate(input)`
- `promoteCatalogImportCandidateToDraft(input)`

### Read strategy

Use the app DB server client.

Preferred read sources:

- `v_catalog_import_batches`
- `v_catalog_import_batch_clusters`
- `v_catalog_import_cluster_candidates`

Allowed composition for detail pages:

- read one row from a base `catalog_import_*` table when the detail shape is not fully available from a view
- compose related candidate or cluster rows from the views

This is acceptable because the contract does not provide dedicated detail views.

### Mutation strategy

All writes go through DB RPCs:

- `catalog_import_set_preferred_candidate`
- `catalog_import_set_candidate_alternate`
- `catalog_import_mark_candidate_needs_rewrite`
- `catalog_import_reject_candidate`
- `catalog_import_promote_candidate_to_draft`

The adapter owns:

- calling the RPC
- normalizing returned data
- converting DB errors into page-usable error messages

## UI Plan

## 1) Studio Nav And Dashboard

Add a `Catalog Intake` entry to:

- `components/studio/StudioShell.tsx`
- `app/(studio)/studio/page.tsx`

Update dashboard copy so Studio is no longer framed primarily around scraped ingestion.

Recommended dashboard cards:

- Drafts
- Catalog Intake
- Registry
- Export
- Ingestion only when enabled

## 2) Batch List Page

Route:

- `/studio/catalog-intake`

Primary goal:

- show all catalog import batches with clear review progress

Fields to show:

- family
- batch code
- version
- segment
- row count
- candidate count
- cluster count
- pending count
- ready-for-draft count
- promoted count
- rejected count
- updated at

Behavior:

- sortable or default ordered by `updated_at desc`
- link each row to batch detail

## 3) Batch Detail Page

Route:

- `/studio/catalog-intake/[batchId]`

Primary goal:

- show the reviewable cluster queue for one batch

Header content:

- batch code
- family
- version
- segment
- source path
- source pool path when available
- row count
- summary counts
- unclustered count when greater than zero

Cluster table content:

- canonical title
- review status
- preferred title
- batch candidate count
- total candidate count
- promoted draft indicator
- updated at

Behavior:

- link each row to the global cluster detail route

## 4) Cluster Detail Page

Route:

- `/studio/catalog-intake/clusters/[clusterId]`

Primary goal:

- let editors choose and act on candidates inside one concept cluster

Header content:

- canonical title
- family
- event anchor
- anchor family
- concept key
- review status
- preferred candidate id or title
- linked promoted draft when available

Candidate list content:

- title
- batch code
- source row number
- editor state
- preferred flag
- machine duplicate state
- machine score
- specificity level
- event anchor / anchor family
- duplicate-of candidate or idea ids when present
- linked draft when present
- editor note when present

Behavior:

- viewers can inspect
- editors/admins can mutate candidate state
- promotion redirects to `/studio/drafts/[id]`

## Mutation UX

Use the existing Studio pattern:

- page-local server actions
- `requireStudioUser("editor")` for mutations
- redirect-based banners via query params

Recommended behavior:

- preferred / alternate / needs rewrite / reject:
  - redirect back to the same cluster detail page
  - show success or error banner
- promote:
  - redirect to `/studio/drafts/[draftId]`
  - preserve warning query when RPC returns non-empty warnings

## Ingestion Decoupling Plan

## 1) Environment Validation

Change `scripts/validate-env.mjs` so `--runtime studio` requires only app DB env.

Keep ingestion env required for:

- `--runtime pipeline`
- `--runtime pipeline-reconcile`

If needed, add a separate internal helper for "is ingestion configured" rather than keeping ingestion mandatory for all Studio runs.

## 2) Optional Ingestion Env Helper

Refactor `lib/ingestion/env.ts` to support both:

- strict access: existing `getIngestionEnv()` behavior for pipeline/ingestion code
- optional presence checks for Studio UI gating

Recommended shape:

- `hasIngestionEnv(): boolean`
- keep `getIngestionEnv()` strict for callers that truly need it

## 3) Conditional Ingestion UI

Update the old ingestion routes so they fail closed but safely:

- if ingestion is not configured, render a simple unavailable page state
- do not attempt ingestion DB calls

The nav/dashboard should not point users there unless ingestion is enabled.

This preserves the code without making it a deployment dependency.

## Implementation Order

## Phase 1: Runtime Decoupling

Goal:

- Studio boots with only app DB env

Tasks:

- loosen Studio env validation
- add optional ingestion-config detection
- hide old ingestion nav/dashboard entry when disabled
- guard old ingestion routes with explicit unavailable state
- update top-level README runtime expectations

Success criteria:

- `npm run dev` works without ingestion env
- `/studio` loads
- `/studio/drafts` loads
- `/studio/catalog-intake` can be built on top of app DB only
- direct visit to `/studio/ingestion` does not crash when ingestion env is missing

## Phase 2: Catalog Intake Adapter

Goal:

- establish one clean boundary for all catalog-intake reads and mutations

Tasks:

- create `lib/studio/catalog-intake.ts`
- define typed row/result models from `types.gen.ts`
- implement list/detail reads
- implement RPC wrappers
- define reject reason constants

Success criteria:

- no raw `catalog_import_*` queries in page files
- all mutations route through the adapter

## Phase 3: Entry Points

Goal:

- expose `Catalog Intake` in Studio

Tasks:

- update `StudioShell`
- update dashboard

Success criteria:

- editors and viewers can find the new feature from normal Studio navigation

## Phase 4: Batch List And Batch Detail

Goal:

- allow editorial review to start from imported batches

Tasks:

- build batch list page
- build batch detail page
- show status counts and cluster links
- show unclustered count if present

Success criteria:

- a user can move from dashboard to batch to cluster without touching the old ingestion UI

## Phase 5: Cluster Detail And Mutations

Goal:

- make the review loop functional

Tasks:

- build cluster detail page
- add server actions
- connect actions to adapter
- redirect promotion into existing draft workflow

Success criteria:

- editor can set preferred
- editor can mark alternate
- editor can mark needs rewrite
- editor can reject
- editor can promote and land in draft editor

## Phase 6: Local Validation And Cleanup

Goal:

- prove the feature works with local fixture data

Tasks:

- validate against `db/supabase/seeds/catalog-intake.ts` fixture data
- verify mixed candidate states render correctly
- verify promoted rows link to drafts
- update README and any Studio-facing copy that still overstates scraped ingestion as the primary workflow

Success criteria:

- local fixture batches and clusters are visible
- all supported state transitions work
- Studio remains healthy with no ingestion DB configured

## Acceptance Criteria

## Catalog Intake

- `Catalog Intake` appears in Studio nav and dashboard
- batch list route works
- batch detail route works
- cluster detail route works
- candidate states are clearly visible
- linked drafts are clearly visible
- all five supported actions work through DB RPCs
- promotion redirects into existing draft editing flow

## Ingestion Decoupling

- Studio startup does not require ingestion DB env
- hidden ingestion feature does not block dev/build/start
- old ingestion routes do not crash when ingestion env is absent
- old ingestion code remains available for future use

## Data Integrity

- no catalog-intake code writes `idea_drafts.ingest_candidate_id`
- no catalog-intake code reads or writes `ingest_*`
- only `catalog_import_candidate_id` is used for draft linkage in this workflow

## Validation Notes

Use the local fixture seed from the db submodule as the primary validation dataset:

- `db/supabase/seeds/catalog-intake.ts`

This fixture already includes:

- batches
- clusters
- preferred candidates
- alternates
- needs rewrite
- rejected candidates
- promoted candidates linked to drafts

That is enough to validate the v1 Studio review loop without inventing mock UI data.

## Risks To Watch During Implementation

- accidentally importing `lib/studio/ingestion.ts` patterns too literally and recreating a second service dependency
- letting page files bypass the catalog-intake adapter
- allowing inconsistent reject reason codes
- forgetting route-level guards for dormant ingestion pages
- letting dashboard/nav copy continue to center a feature that may be inactive in deployment

## Bottom Line

This plan keeps the work thin and explicit:

- make Studio operational without the old ingestion DB
- add a separate app-DB-backed `Catalog Intake` review surface
- reuse the existing draft workflow as the endpoint
- avoid broad rewrites and avoid blending the two ingestion systems
