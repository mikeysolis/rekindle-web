# Rekindle Studio Catalog Intake + Ingestion Decoupling Gap Audit v0

**Status:** Planning audit  
**Audience:** internal devs / product  
**Purpose:** identify gaps in the current plans before writing the final implementation plan for:

- the new Studio `Catalog Intake` feature backed by `catalog_import_*`
- making the existing Studio app run without the separate scraped-ingestion DB

## Sources Reviewed

- `db/docs/studio_catalog_intake_contract.md`
- `db/docs/studio_draft_ingestion_and_clustering_plan.md`
- `db/supabase/migrations/0048_studio_catalog_intake.sql`
- `components/studio/StudioShell.tsx`
- `app/(studio)/studio/page.tsx`
- `app/(studio)/studio/ingestion/page.tsx`
- `app/(studio)/studio/ingestion/[id]/page.tsx`
- `lib/studio/ingestion.ts`
- `lib/studio/drafts.ts`
- `lib/database/types.gen.ts`
- `scripts/validate-env.mjs`
- `lib/ingestion/env.ts`
- `README.md`
- `db/supabase/seeds/catalog-intake.ts`

## Summary

The database-side contract for catalog intake is strong enough to support a thin Studio review surface. The larger gaps are not in the new `catalog_import_*` schema itself; they are in:

- source-of-truth drift between older planning docs and the new contract
- runtime assumptions that still make the main Studio app depend on the old ingestion DB
- a few unresolved UI/adapter questions that are not fully specified by the current contract

The final implementation plan should treat this as two linked tracks:

1. catalog-intake UI implementation
2. scraped-ingestion runtime decoupling

If those tracks are mixed together informally, the risk is building the right new UI on top of a Studio runtime that still cannot boot or deploy without an unused service.

## Gap 1: Source-Of-Truth Drift

**Severity:** high

The canonical implementation target is now:

- `db/docs/studio_catalog_intake_contract.md`
- `db/supabase/migrations/0048_studio_catalog_intake.sql`

The older plan doc still carries stale terms in a few places, including:

- `idea_ingest_*` naming
- `idea_drafts.ingest_candidate_id`

This is risky because the old scraped-ingestion system already owns:

- `ingest_*`
- `idea_drafts.ingest_candidate_id`

**Gap:** the final implementation plan needs an explicit statement that the contract doc and migration `0048` override older naming and linkage references wherever they disagree.

## Gap 2: Studio Startup Still Hard-Depends On The Ingestion DB

**Severity:** critical

Today the Studio runtime still assumes the scraped-ingestion DB exists and is configured:

- `package.json` runs `scripts/validate-env.mjs --runtime studio` on `predev`, `prebuild`, and `prestart`
- `scripts/validate-env.mjs` requires `INGEST_SUPABASE_URL` and `INGEST_SUPABASE_SERVICE_ROLE_KEY` for Studio runtime
- `lib/ingestion/env.ts` throws if those env vars are missing

This means the app cannot cleanly run in a catalog-intake-only mode yet.

**Gap:** the current plans do not include a concrete runtime-decoupling step for Studio startup.

**Final plan must decide:**

- whether Studio runtime should treat ingestion env as optional
- whether scraped ingestion should be hidden by default when ingestion env is absent
- whether the old ingestion routes should become unavailable, read-only, or intentionally hidden in non-ingestion deployments

## Gap 3: No Explicit Feature Visibility Plan For The Dormant Ingestion UI

**Severity:** high

Current navigation and dashboard copy still present scraped ingestion as a primary Studio feature:

- `components/studio/StudioShell.tsx`
- `app/(studio)/studio/page.tsx`
- `README.md`

If ingestion is not going live, leaving those entry points always visible creates an operational mismatch.

**Gap:** the plans say "do not remove it" but do not define the desired user-facing behavior.

**Final plan must decide:**

- hide `Ingestion` from nav/dashboard when ingestion is disabled
- show a disabled state with explanation
- keep route reachable only in configured environments

This needs to be explicit before implementation starts.

## Gap 4: Catalog Intake Adapter Boundary Is Clear, But The Read Model Is Slightly Incomplete

**Severity:** medium

The contract correctly requires a single adapter:

- `lib/studio/catalog-intake.ts`

The read surfaces provided by `0048` are:

- `v_catalog_import_batches`
- `v_catalog_import_batch_clusters`
- `v_catalog_import_cluster_candidates`

That is enough for most UI work, but not every detail shape is fully pre-packaged.

### Missing clarity for single-record reads

The requested adapter API includes:

- `getCatalogImportBatch(batchId)`
- `getCatalogImportCluster(clusterId)`

But there is no dedicated batch-detail or cluster-detail view. The adapter will need to compose from:

- base tables
- existing views

or the DB contract must be extended with more dedicated views.

**Gap:** the current plans do not specify whether reading from base `catalog_import_*` tables is acceptable for detail pages, or whether the web layer should stay strictly view/RPC-only.

## Gap 5: Unclustered Candidates Are Not Accounted For In The UI Plan

**Severity:** medium

The batch-detail plan says:

- list clusters for the batch

The batch cluster view only includes rows where `cluster_id is not null`.

If a batch contains candidates that have not yet been clustered, they will not appear in the cluster list.

**Gap:** the final plan does not say whether unclustered candidates are:

- impossible by the time Studio sees a batch
- acceptable to hide in v1
- required to appear in a separate "Unclustered" section

This should be decided up front because it changes page scope and adapter shape.

## Gap 6: Global Cluster Route Needs A Scope Decision

**Severity:** medium

The requested route is global:

- `/studio/catalog-intake/clusters/[clusterId]`

Clusters are also global, not batch-scoped.

That creates an ambiguity:

- should cluster detail show all candidates in the cluster across all batches?
- or should it preserve the user's originating batch context somehow?

The existing view `v_catalog_import_cluster_candidates` can support a global cluster page, but the UI expectation should be stated explicitly.

**Gap:** current planning does not resolve whether cluster detail is:

- cluster-global
- batch-contextual
- both, with an optional batch filter

## Gap 7: Decision Log Exists In DB But Is Not Yet Accounted For In The UI Scope

**Severity:** medium

`catalog_import_decisions` is part of the new contract and is important for editorial traceability. However, the current route plan only calls for:

- batch list
- batch detail
- cluster detail
- mutation actions

There is no explicit plan for whether decisions should be surfaced in v1.

**Gap:** the final plan should explicitly say one of:

- no decision history UI in v1
- show recent decisions on cluster detail
- show decision history only if already available through a simple adapter call

Without that decision, the implementation plan will drift during development.

## Gap 8: Reject Reason Consistency Is A Web-Layer Responsibility Right Now

**Severity:** medium

The contract gives recommended reject reason codes, but the DB RPC currently only enforces:

- `reason_code` must be non-empty

It does not enforce a fixed enum in SQL.

**Gap:** if you want consistent analytics and future workflow quality, the final implementation plan needs to state that the Studio web layer owns a fixed allowed reason-code list for catalog intake.

Otherwise different strings can leak into production data.

## Gap 9: Promotion Expectations Need To Stay Intentionally Thin

**Severity:** medium

The new catalog-intake promotion RPC already owns draft creation/reuse and sets:

- `idea_drafts.catalog_import_candidate_id`
- draft title
- provenance note in `editorial_note`

Unlike the scraped-ingestion flow, this RPC does not currently copy:

- descriptions
- reason snippets
- draft traits

That is fine for v1 if it is intentional.

**Gap:** the final implementation plan should explicitly state that catalog intake promotion is a thin handoff into existing draft editing, not a trait-prefill or full authoring pipeline.

If that is not stated, implementation will tend to drift toward recreating more logic in web code.

## Gap 10: Mutation UX Rules Are Not Fully Specified

**Severity:** medium

The current Studio pages use a consistent pattern:

- server-first pages
- page-local server actions
- `requireStudioUser(...)`
- redirect-based success/error banners

That pattern is reusable, but the catalog-intake plan does not yet define:

- whether all mutations redirect back to the same cluster page
- whether batch pages need success banners too
- how RPC errors for immutable states should be displayed
- how promotion warnings JSON should be normalized in the adapter

**Gap:** the final plan should define the post-action navigation and banner behavior, especially for promotion to draft.

## Gap 11: Auth And Role Expectations Should Be Made Explicit

**Severity:** low

The existing Studio app already has clear role patterns:

- viewer: read-only
- editor/admin: mutate

The catalog-intake contract assumes actor validation through RPCs, but the implementation plan should still clearly state the intended web behavior:

- batch and cluster pages visible to viewers
- action forms only for editors/admins

This is probably the desired behavior, but it should be written into the final plan instead of left implicit.

## Gap 12: Local Validation Workflow Is Present, But Not Folded Into The Web Plan

**Severity:** medium

The DB submodule already includes fixture data support:

- `db/supabase/seeds/catalog-intake.ts`

That is enough to validate real UI states locally, including:

- preferred candidates
- alternates
- needs-rewrite
- rejected
- promoted-to-draft

**Gap:** the current implementation brief mentions fixture data, but the final plan should explicitly include:

- how fixture rows are loaded
- what local checks prove the feature works
- how to validate the app in a mode where the old ingestion DB is absent

This is especially important because one of the new goals is "app functions without ingestion DB in operation".

## Gap 13: Documentation And Positioning Need Cleanup If Ingestion Becomes Optional

**Severity:** medium

Current top-level docs still position the repo and Studio primarily around scraped ingestion:

- `README.md` title and environment section
- `README.md` primary route list
- ingestion spec pack references throughout `docs/specs/ingestion/*`

That is not inherently wrong, but it becomes misleading if the deployment target is now:

- Studio + catalog intake first
- scraped ingestion later or optional

**Gap:** the final plan should include documentation updates as part of the rollout, not as an afterthought.

At minimum this affects:

- runtime environment docs
- local setup expectations
- Studio navigation/product copy

## Gap 14: Acceptance Criteria Need A Separate Track For "No Ingestion DB" Operation

**Severity:** high

The catalog-intake contract defines the new feature well, but it does not define acceptance criteria for the operational change you now want:

- the app should function without the ingestion DB running

That needs its own explicit acceptance criteria, separate from the catalog-intake UI acceptance criteria.

Suggested acceptance areas for the final plan:

- Studio boot succeeds with only app DB env vars
- catalog-intake routes work against app DB only
- old scraped-ingestion UI does not break the app when ingestion env is absent
- draft workflow remains unchanged
- no cross-linkage confusion between `ingest_candidate_id` and `catalog_import_candidate_id`

## Recommended Planning Sequence

The final implementation plan should be sequenced in this order:

1. Define the target behavior for dormant scraped ingestion.
2. Decouple Studio runtime startup from mandatory ingestion env.
3. Define the UI scope for catalog intake detail pages:
   - cluster-global vs batch-contextual
   - unclustered candidate handling
   - decision-history visibility
4. Lock the web-owned catalog-intake constants:
   - reject reason codes
   - visible candidate/cluster states
5. Implement the catalog-intake adapter against the `0048` contract.
6. Implement routes and server actions.
7. Validate against local fixture data.
8. Update top-level docs and deployment assumptions.

## Bottom Line

The catalog-intake backend contract is ready enough to support a thin Studio review UI.

The biggest missing piece is not database design. It is operational clarity:

- what Studio should do when scraped ingestion is not configured
- what scope the catalog-intake pages should have at the cluster/detail level
- which data consistency rules the web layer must enforce because the DB contract intentionally leaves them flexible

Those decisions should be locked before writing the final implementation plan.
