# Ingestion Execution Backlog and Task Checklist (v1)
_Last updated: 2026-02-28_

## 1) Purpose

Convert the ingestion specs into a concrete, trackable implementation backlog.

This document is the task-by-task execution checklist for engineering and editorial operations.

## 2) How to Use This Backlog

1. Execute in numeric task order unless a dependency allows parallel work.
2. Treat each task acceptance criteria as blocking for completion.
3. Attach evidence for every completed task:
   - PR link
   - migration ID (if schema changed)
   - dashboard or screenshot link
   - run log ID(s)
4. Do not mark an epic complete until all tasks and its gate are satisfied.

## 3) Status Legend

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked

## 4) Global Definition of Done

For every engineering task:

1. Code implemented with tests.
2. Logs/metrics emitted.
3. Runbook updated if operational behavior changed.
4. No violations of ingestion safety/compliance contracts.

For every Studio workflow task:

1. Action is auditable with actor + timestamp.
2. Action writes required labels when applicable.
3. UX supports editor confidence (evidence-first, clear status, clear errors).

## 5) Critical Path

1. Foundation and contracts (Epic 0)
2. Current-loop quality and reliability (Epic 1)
3. Multi-source scaling (Epic 2)
4. Source intelligence automation (Epic 3)
5. Learning and experiments (Epic 4)
6. Production operations and governance maturity (Epic 5)

## 5.1) Epic-to-Phase Mapping

1. Epic 0 = prerequisite foundation before phase execution.
2. Epic 1 = aligns to Phase 0 in `10_implementation_plan.md`.
3. Epic 2 = aligns to Phase 1.
4. Epic 3 = aligns to Phase 2.
5. Epic 4 = aligns to Phase 3.
6. Epic 5 = aligns to Phase 4.

## 6) Epic 0: Foundation and Contract Lock

### ING-001: Lock unresolved policy and architecture decisions
Dependencies: none

Checklist:
- [x] Resolve `11_decisions_and_open_questions.md` items required before Phase 2.
- [x] Record explicit decisions for discovery authority, strategy automation scope, queue runtime, config storage, and duplicate method.
- [x] Publish owners for source approval and source retirement decisions.

Acceptance criteria:
1. Open questions required for Epics 2-5 are resolved with a dated decision log.
2. No implementation tasks remain blocked by undefined ownership or policy.

### ING-002: Finalize environment and secret namespace contract
Dependencies: ING-001

Checklist:
- [x] Define canonical env var names for app DB vs ingestion DB.
- [x] Ensure no naming collisions between Studio runtime and ingestion runtime.
- [x] Add startup validation that fails fast on missing critical vars.

Acceptance criteria:
1. A single environment contract doc exists and is referenced by runtime code.
2. Local/staging/prod startup fails with actionable errors if required vars are missing.

### ING-003: Implement required Phase 3+ analytics tables
Dependencies: ING-001

Checklist:
- [x] Add migrations for `ingest_editor_labels`, `ingest_experiments`, `ingest_experiment_metrics`, `ingest_tuning_changes`.
- [x] Add indexes and FK constraints defined in `04_data_model_and_contracts.md`.
- [x] Add rollback/recovery notes in migration comments or runbook.

Verification note:
1. Linked ingestion project migration apply verified on 2026-02-28 via `supabase db push --linked --workdir ./ingestion` (applied `0002_ingestion_learning_analytics.sql`).
2. Optional local verification command (if needed): `supabase db reset --workdir ./ingestion --no-seed`.

Acceptance criteria:
1. Migrations apply cleanly to local and linked staging.
2. Table contracts match fields specified in ingestion docs.

### ING-004: Implement source registry schema and audit log
Dependencies: ING-001

Checklist:
- [x] Create source registry storage contract matching `05_source_intelligence_and_strategy.md`.
- [x] Implement lifecycle state transition guardrails.
- [x] Add immutable audit events for every state/config mutation.

Verification note:
1. Linked ingestion project migration apply verified on 2026-02-28 via `supabase db push --linked --workdir ./ingestion` (applied `0003_ingestion_source_registry.sql`).
2. Linked schema lint passed on 2026-02-28 via `supabase db lint --linked --workdir ./ingestion --schema public --fail-on error`.

Acceptance criteria:
1. Invalid lifecycle transitions are rejected.
2. All state/config changes are traceable with old/new values and actor.

### ING-005: Add safe operations guardrails for destructive commands
Dependencies: ING-001

Checklist:
- [x] Update runbook/CLI docs to require explicit confirmation for linked remote reset.
- [x] Add ingestion-only cleanup SQL path as default operational path.
- [x] Add environment verification step before any full reset command.

Verification note:
1. Guarded reset CLI wrapper added: `scripts/ingest-db-ops.mjs`.
2. Cleanup SQL default path added: `ingestion/supabase/sql/cleanup_ingestion_tables.sql`.
3. Reset commands now require explicit override flags, confirm token, and `INGEST_ENVIRONMENT` match.
4. Ops runbook added: `15_operations_runbook.md`.
5. Verified on 2026-02-28:
   - `npm run ingest:supabase:reset:linked` is blocked by default.
   - dry-run resets succeed only with explicit guard flags and matching environment confirmation.

Acceptance criteria:
1. Routine cleanup path never requires full DB reset.
2. Remote reset is blocked by default without explicit override and environment confirmation.

Gate for Epic 0:
1. Contract docs and runtime constraints are aligned with no unresolved blockers for Epic 1.

## 7) Epic 1: Stabilize Current Ingestion Loop

### ING-010: Harden RAK extractor for idea precision
Dependencies: ING-002

Checklist:
- [x] Refine discovery selectors/patterns to prioritize actionable idea content.
- [x] Enforce canonical per-item `source_url` capture (no list-page URL reuse).
- [x] Add source-specific cleaning heuristics to reduce article-style noise.
- [x] Add extractor fixture tests for positive and negative samples.

Verification note:
1. Refactored RAK parsing into `pipeline/src/sources/rak/parser.ts` with canonical URL handling and actionable-line extraction heuristics.
2. Added RAK fixtures and tests:
   - `pipeline/src/sources/rak/fixtures/listing_page.html`
   - `pipeline/src/sources/rak/fixtures/detail_page_actionable.html`
   - `pipeline/src/sources/rak/fixtures/detail_page_noise.html`
   - `pipeline/src/sources/rak/parser.test.ts`
3. Verified with `npm run pipeline:test:rak` on 2026-02-28 (4/4 tests passing).
4. Live KPI check (`source_url` detail-page rate >= 95%) remains to validate from real run telemetry.

Acceptance criteria:
1. `source_url` points to the actual item page for >= 95% of new candidates.
2. Fixture tests fail on regressions and pass in CI.

### ING-011: Add baseline pre-inbox quality rules
Dependencies: ING-010

Checklist:
- [x] Add deterministic filters for non-idea content.
- [x] Add duplicate candidate hints based on candidate key/similarity.
- [x] Add minimum quality threshold with explainable rejection flags.

Verification note:
1. Added deterministic quality rules in `pipeline/src/core/quality.ts`.
2. Pipeline now writes machine quality metadata (`quality.version`, `score`, `threshold`, `passed`, `flags`) into `meta_json` and sets status to `curated` (pass) or `normalized` (filtered).
3. Studio candidate detail now exposes quality metadata and duplicate hints.
4. Inbox default filter updated to `curated` to down-rank machine-filtered rows.
5. Added tests:
   - `pipeline/src/core/quality.test.ts`
   - `pipeline/src/sources/rak/parser.test.ts` (existing fixture suite)

Acceptance criteria:
1. Noise candidates are reduced without lowering valid idea yield.
2. Every machine-filtered candidate records reason metadata.

### ING-012: Complete promotion consistency and reconciliation flow
Dependencies: ING-003

Checklist:
- [x] Implement write order and failure semantics from `04_data_model_and_contracts.md`.
- [x] Implement hourly reconciliation job for cross-DB repair.
- [x] Emit reconciliation metrics and alert on spikes.

Verification note:
1. Studio promotion now follows required write order in `lib/studio/ingestion.ts`:
   - creates `ingest_sync_log` pending row before app draft write
   - finalizes pending row to `success` or `failed`
   - keeps candidate status unchanged when app draft write fails
2. Promotion now surfaces non-blocking warnings when ingestion status/log updates fail after successful app draft write, preserving idempotent retry behavior.
3. Added cross-DB reconciliation job and CLI command:
   - `pipeline/src/jobs/reconcile-promotions.ts`
   - `npm run pipeline:reconcile-promotions`
4. Reconciliation emits structured metrics (`planned*`, `repaired*`, `failed*`, `totalRepairs`) and logs a warning when repair volume exceeds `INGEST_RECONCILIATION_SPIKE_THRESHOLD`.
5. Added regression tests:
   - `pipeline/src/jobs/reconcile-promotions.test.ts`

Acceptance criteria:
1. Promotion remains idempotent under retries.
2. Reconciliation repairs desync cases and logs all fixes.

### ING-013: Improve Studio inbox evidence and duplicate awareness
Dependencies: ING-011, ING-012

Checklist:
- [x] Show raw excerpt, source URL, and quality flags in detail view.
- [x] Show duplicate hints with link to existing draft/candidate.
- [x] Add filters for source, status, confidence, duplicate risk, date.

Verification note:
1. Candidate detail view includes raw excerpt, source URL, and machine quality metadata in `app/(studio)/studio/ingestion/[id]/page.tsx`.
2. Duplicate hints now include both candidate links and promoted draft links when available (`lib/studio/ingestion.ts`, `app/(studio)/studio/ingestion/[id]/page.tsx`).
3. Inbox filters now include confidence band, duplicate risk, and updated date range in addition to source/status/search (`app/(studio)/studio/ingestion/page.tsx`).
4. Candidate list rows now surface confidence + quality score and duplicate risk to support evidence-first triage.

Acceptance criteria:
1. Editors can triage and decide without leaving Studio for most candidates.
2. Duplicate-caused mistaken promotions are measurably reduced.

### ING-014: Add runbook coverage for replay and cleanup
Dependencies: ING-005, ING-012

Checklist:
- [x] Document replay flow by run ID.
- [x] Document ingest-table truncate workflow.
- [x] Document failure-response steps for common ingestion incidents.

Verification note:
1. Expanded operations runbook in `15_operations_runbook.md` with run-ID-based replay procedure (identify run, baseline capture, replay execution, verification).
2. Added explicit ingest-table truncate workflow for local and linked ingestion targets, including verification SQL checks.
3. Added incident playbooks for:
   - source extraction breakage
   - ingestion DB connectivity failure
   - promotion/reconciliation desync
   - duplicate explosion
   - low-quality surge
4. Runbook now includes preflight validation and post-incident closure checklist to reduce tribal knowledge dependency.

Acceptance criteria:
1. On-call engineer can execute replay/reset from runbook without tribal knowledge.

Gate A (Epic 1 exit; trailing 14 days):
1. run success rate >= 95%
2. promotion rate >= 10% on at least one active source
3. duplicate-confirmed rate <= 15%
4. no direct publish path from ingestion

## 8) Epic 2: Multi-Source Expansion

### ING-020: Standardize source module interface and test harness
Dependencies: ING-004, ING-014

Checklist:
- [x] Enforce `discover`, `extract`, `health_check` contract.
- [x] Build reusable fixture runner for source modules.
- [x] Add contract tests for output shape and metadata completeness.

Verification note:
1. Source module interface now requires `healthCheck` in addition to `discover`/`extract` (`pipeline/src/core/types.ts`).
2. Runtime contract validators added and enforced during runs:
   - source module shape
   - health-check result shape
   - discovered page shape
   - extracted candidate shape + metadata completeness (`extraction_strategy` + evidence pointer)
   (`pipeline/src/sources/contract.ts`, `pipeline/src/jobs/run-source.ts`, `pipeline/src/sources/registry.ts`).
3. Reusable source fixture runner added (`pipeline/src/sources/fixture-runner.ts`) and used by RAK source contract tests.
4. Contract tests added:
   - `pipeline/src/sources/contract.test.ts`
   - `pipeline/src/sources/rak/source.contract.test.ts`
   - runnable via `npm run pipeline:test:sources`

Acceptance criteria:
1. New source modules can be added using shared scaffolding and tests.

### ING-021: Implement Tier-1 source modules
Dependencies: ING-020

Checklist:
- [x] Add `ggia` module.
- [x] Add `dosomething` module.
- [x] Add `action_for_happiness` module (ICS-first where available).
- [x] Add `red_cross_pdf` module.

Verification note:
1. Added source modules:
   - `pipeline/src/sources/ggia/index.ts`
   - `pipeline/src/sources/dosomething/index.ts`
   - `pipeline/src/sources/action_for_happiness/index.ts`
   - `pipeline/src/sources/red_cross_pdf/index.ts`
2. `action_for_happiness` extraction is ICS-first (`ics_event_feed`) when `.ics` pages are discovered.
3. Added source fixture suites + contract tests for all Tier-1 modules:
   - `pipeline/src/sources/*/fixtures/*`
   - `pipeline/src/sources/*/source.contract.test.ts`
4. Source registry now includes all Tier-1 modules and `pipeline:list-sources` exposes keys:
   - `rak`, `ggia`, `dosomething`, `action_for_happiness`, `red_cross_pdf`.

Acceptance criteria:
1. Each module passes contract tests and produces candidates in staging.
2. Source attribution and extraction metadata are complete for all modules.

### ING-022: Add per-source runtime controls
Dependencies: ING-020

Checklist:
- [x] Implement cadence, rate limit, and concurrency controls by source.
- [x] Add per-source timeout and retry budgets.
- [x] Add source-level health scoring.

Verification note:
1. `run-source` now loads runtime policy from `ingest_source_registry` and enforces:
   - cadence window evaluation (`--respect-cadence` / `--force`)
   - max RPS pacing across discover/extract operations
   - bounded page extraction concurrency
   - include/exclude URL pattern filters
   (`pipeline/src/jobs/run-source.ts`, `pipeline/src/jobs/runtime-controls.ts`).
2. Per-source timeout and retry budgets are enforced for health/discover/extract operations:
   - timeout budget from `timeout_seconds`
   - retry budget/backoff from `metadata_json.runtime.*` (with defaults)
   (`pipeline/src/jobs/runtime-controls.ts`).
3. Source-level health metrics are written back to source registry after each run:
   - `last_run_at`, `last_success_at`
   - rolling promotion/failure rates
   - computed health metadata (`health_score`, `consecutive_failures`, last run signals)
   (`pipeline/src/durable-store/repository.ts`, `pipeline/src/jobs/run-source.ts`).
4. New CLI command `source-health` exposes actionable source health signals:
   (`pipeline/src/jobs/source-health.ts`, `pipeline/src/index.ts`, `package.json`).

Acceptance criteria:
1. A failing source cannot starve or destabilize other active sources.
2. Source health view shows actionable failure and yield signals.

### ING-023: Add source portfolio visibility
Dependencies: ING-021, ING-022

Checklist:
- [x] Dashboard: accepted ideas per source.
- [x] Dashboard: source precision proxy and maintenance burden.
- [x] Dashboard: freshness and diversity contribution.

Verification note:
1. Added source portfolio metric aggregation service:
   - `listIngestionSourcePortfolioMetrics(windowDays)` in
     `lib/studio/ingestion.ts`.
2. Portfolio metrics now include per-source:
   - accepted ideas
   - precision proxy (`accepted / inboxed`)
   - maintenance burden proxy (`(partial+failed) / total runs` + failed pages)
   - freshness contribution (share of accepted ideas in trailing 7 days)
   - diversity contribution (traits-based, with title-uniques fallback).
3. Added portfolio dashboard section in Studio ingestion page:
   - summary KPI cards
   - per-source portfolio table
   - selectable 7/30/90 day portfolio window
   (`app/(studio)/studio/ingestion/page.tsx`).

Acceptance criteria:
1. Product/editorial can prioritize crawl budget using objective source metrics.

Gate B (Epic 2 exit; trailing 14 days):
1. schedule adherence >= 97%
2. run success rate >= 97%
3. at least 4 active sources with weekly accepted ideas > 0

## 9) Epic 3: Source Intelligence and Adaptive Strategy

### ING-030: Implement source probe/onboarding service
Dependencies: ING-004, ING-020

Checklist:
- [x] Probe root/list pages and detect structure patterns.
- [x] Generate recommended strategy ladder and confidence.
- [x] Save onboarding report with operator approval action.

Verification note:
1. Added onboarding report schema migration:
   - `ingestion/supabase/migrations/0005_ingestion_source_onboarding_reports.sql`.
2. Implemented source probe job with root/list/robots/sitemap probing and strategy recommendation:
   - `pipeline/src/jobs/source-probe.ts`.
3. Added onboarding persistence and source proposal helper in durable repository:
   - `pipeline/src/durable-store/repository.ts`.
4. Added CLI + npm command for onboarding probe execution:
   - `pipeline/src/index.ts`
   - `npm run pipeline:source-probe -- <url_or_domain>`.
5. Added probe heuristics tests and verified on 2026-03-01:
   - `pipeline/src/jobs/source-probe.test.ts`
   - `npm run pipeline:test:source-probe`.

Acceptance criteria:
1. New source onboarding can be completed with a repeatable operator workflow.

### ING-031: Implement strategy selection engine and fallback ladder
Dependencies: ING-030

Checklist:
- [x] Select best strategy from configured order by reliability/cost/risk.
- [x] Fallback automatically when primary strategy fails.
- [x] Persist selected strategy and reason in run metadata.

Verification note:
1. Added strategy selection engine with scoring + strategy URL bucketing:
   - `pipeline/src/jobs/strategy-selection.ts`.
2. Added automatic fallback ladder execution in source runtime:
   - `pipeline/src/jobs/run-source.ts`.
3. Run metadata now persists strategy decision payload (`strategy_selection`) including:
   - configured/ranked order
   - selected primary/effective strategy
   - scoring and reasoning
   - per-strategy attempt results and fallback signals.
4. Source registry runtime metadata now tracks rolling per-strategy performance for future selection reliability:
   - `metadata_json.strategy_performance.*`.
5. Added strategy selection tests:
   - `pipeline/src/jobs/strategy-selection.test.ts`.
6. Verified on 2026-03-01:
   - `npm run pipeline:build`
   - `npm run pipeline:test:runtime`.

Acceptance criteria:
1. Strategy decisions are explainable and replayable from logs.
2. Fallback behavior improves run resilience on partial source breakage.

### ING-032: Implement source lifecycle automation hooks
Dependencies: ING-004, ING-031

Checklist:
- [x] Auto-mark sources degraded on sustained failure/quality drop.
- [x] Downgrade cadence in degraded state.
- [x] Trigger operator alert with evidence bundle.

Verification note:
1. Added lifecycle automation policy module:
   - `pipeline/src/jobs/lifecycle-automation.ts`.
2. Integrated lifecycle automation into run finalization:
   - evaluates sustained failure/quality-drop triggers from health metadata
   - auto-transitions `active -> degraded` via audited DB function (`set_source_state`)
   - auto-downgrades cadence for degraded sources via audited DB function (`update_source_config`)
   - writes evidence bundle to `metadata_json.lifecycle.*`
   - emits structured lifecycle alert logs.
   (`pipeline/src/jobs/run-source.ts`).
3. Expanded runtime health metadata to support sustained-trigger logic:
   - `observed_runs`
   - `observed_failed_runs`
   - `consecutive_low_quality_runs`
   (`pipeline/src/jobs/runtime-controls.ts`).
4. Added lifecycle automation tests:
   - `pipeline/src/jobs/lifecycle-automation.test.ts`
   - `pipeline/src/jobs/runtime-controls.test.ts` updated assertions.
5. Verified on 2026-03-01:
   - `npm run pipeline:build`
   - `npm run pipeline:test:runtime`.

Acceptance criteria:
1. Lifecycle state changes follow allowed transitions only.
2. Degraded sources reduce operational impact without full system interruption.

### ING-033: Implement source reactivation and retirement workflows
Dependencies: ING-032

Checklist:
- [x] Add explicit review flow to reactivate paused/degraded sources.
- [x] Add retirement flow with reason and archival metadata.
- [x] Ensure terminal behavior for retired sources.

Verification note:
1. Added source lifecycle mutation service functions for Studio:
   - `reactivateIngestionSource(...)`
   - `retireIngestionSource(...)`
   - `canReactivateIngestionSourceState(...)`
   - `canRetireIngestionSourceState(...)`
   (`lib/studio/ingestion.ts`).
2. Mutations use audited ingestion RPCs (`set_source_state`, `update_source_config`) with:
   - required review reason
   - required product owner approval + compliance acknowledgment
   - lifecycle metadata history persisted under `metadata_json.lifecycle.*`
   - retirement archival metadata (`archival_reference`, `archival_summary`).
3. Added admin-only Source Lifecycle Review UI in Studio ingestion page:
   - explicit reactivation flow for `paused|degraded`
   - explicit retirement flow for `active|degraded|paused`
   - source-scoped success/error feedback and filter-preserving redirects
   (`app/(studio)/studio/ingestion/page.tsx`).
4. Terminal retired behavior is enforced by:
   - hiding lifecycle actions for `retired` sources in Studio
   - state guardrails in ingestion DB RPC/trigger layer.
5. Verified on 2026-03-01:
   - `npx eslint 'app/(studio)/studio/ingestion/page.tsx' lib/studio/ingestion.ts`.

Acceptance criteria:
1. Reactivation/retirement actions are auditable and policy-compliant.

Gate for Epic 3:
1. Source onboarding and breakage response are repeatable with low manual ambiguity.

## 10) Epic 4: Learning Loop and Experimentation

### ING-040: Capture structured editorial labels in Studio
Dependencies: ING-003, ING-013

Checklist:
- [x] Add required fields to reject/promote/needs-work flows.
- [x] Standardize rejection reason taxonomy in UI.
- [x] Persist label events to `ingest_editor_labels`.

Verification note:
1. Added structured editor-label contracts in Studio ingestion service:
   - rewrite severity enum and validation
   - rejection reason taxonomy constants and validation
   - editor label action mapping (`promoted|promoted_after_edit|rejected|needs_work`)
   (`lib/studio/ingestion.ts`).
2. `reject`, `needs_work`, and `promote` mutations now persist label rows to:
   - `public.ingest_editor_labels`
   with `candidate_id`, action, reject reason (when applicable), rewrite severity (when applicable),
   duplicate confirmation, actor, and timestamp defaults.
3. Studio ingestion detail actions now require structured fields before submit:
   - Promote: promotion type, rewrite severity, duplicate confirmation
   - Needs Work: rewrite severity, duplicate confirmation
   - Reject: standardized reject reason code, duplicate confirmation
   (`app/(studio)/studio/ingestion/[id]/page.tsx`).
4. Verified on 2026-03-01:
   - `npx eslint 'app/(studio)/studio/ingestion/[id]/page.tsx' lib/studio/ingestion.ts`
   - `npx tsc --noEmit`
   - `npx next build --webpack`.

Acceptance criteria:
1. >= 95% of reviewed candidates produce complete label rows.
2. Label schema matches analytics contract exactly.

### ING-041: Build label processing and quality analytics pipeline
Dependencies: ING-040

Checklist:
- [x] Join labels with extraction metadata and source registry.
- [x] Compute per-source/per-strategy KPI slices.
- [x] Publish 7/30/90 day trend outputs.

Verification note:
1. Added label analytics service pipeline:
   - `listIngestionLabelQualityAnalytics(windowDays)`
   - joins `ingest_editor_labels` with candidate extraction metadata (`meta_json.extraction_strategy`)
     and source registry governance metadata (`display_name`, `state`, `approved_for_prod`)
   - computes windowed trend metrics for 7/30/90 days
   - computes per-source and per-strategy KPI slices for selected window
   (`lib/studio/ingestion.ts`).
2. Added editorial quality dashboard section in Studio ingestion page:
   - KPI cards for selected window
   - 7/30/90 trend table
   - per-source KPI table
   - per-strategy KPI table
   (`app/(studio)/studio/ingestion/page.tsx`).
3. Verified on 2026-03-01:
   - `npx eslint lib/studio/ingestion.ts 'app/(studio)/studio/ingestion/page.tsx'`
   - `npx tsc --noEmit`
   - `npx next build --webpack`.

Acceptance criteria:
1. Dashboards expose promotion, rejection reasons, rewrite burden, duplicate-confirmed rate.

### ING-042: Implement experiment framework and tuning history
Dependencies: ING-041

Checklist:
- [x] Create experiment records for each tuning change.
- [x] Store baseline/treatment metrics in `ingest_experiment_metrics`.
- [x] Record deployed config changes in `ingest_tuning_changes`.

Verification note:
1. Added experiment/tuning service contracts and persistence functions:
   - `createIngestionTuningExperiment(...)`
   - `listIngestionExperimentRollouts(...)`
   (`lib/studio/ingestion.ts`).
2. Recording flow now creates linked rows across:
   - `ingest_experiments` (name, hypothesis, status, scope_json with decision/result)
   - `ingest_experiment_metrics` (baseline/treatment/delta per metric)
   - `ingest_tuning_changes` (source/config/change_json/approved_by/applied_at)
   with rollback-on-failure to avoid partial records.
3. Added Studio ingestion “Experiment & Tuning History” section:
   - admin form for recording tuning rollout experiments
   - history table showing hypothesis, status/decision, linked tuning changes, and metrics
   (`app/(studio)/studio/ingestion/page.tsx`).
4. Verified on 2026-03-01:
   - `npx eslint lib/studio/ingestion.ts 'app/(studio)/studio/ingestion/page.tsx'`
   - `npx tsc --noEmit`
   - `npx next build --webpack`.

Acceptance criteria:
1. Every tuning rollout has a linked hypothesis, result, and adopt/revert decision.

### ING-043: Add safe tuning deployment workflow
Dependencies: ING-042

Checklist:
- [x] Add canary/shadow execution mode.
- [x] Enforce sample-size gate:
  - control and treatment each >= 200 reviewed candidates
  - or >= 14 days, whichever is longer
- [x] Block rollout if guardrail metrics regress.

Verification note:
1. Added rollout mode + sample gate + guardrail gate wiring in Studio ingestion service:
   - `IngestionTuningDeploymentMode` (`shadow|canary|full`)
   - sample evidence fields and gate evaluation persistence in `scope_json.rollout_gate`
   - full `adopt` rollouts blocked on gate failures in `createIngestionTuningExperiment(...)`
   (`lib/studio/ingestion.ts`).
2. Added ingestion DB trigger guardrails:
   - `ingest_tuning_rollout_guardrails()` validates deployment mode
   - enforces sample-size thresholds for `adopt`
   - blocks `adopt` when `duplicate_confirmed_rate`, `safety_flag_rate`, or
     `compliance_incident_rate` regress
   (`ingestion/supabase/migrations/0006_ingestion_tuning_rollout_guardrails.sql`).
3. Updated Studio ingestion UI:
   - rollout mode selector, sample evidence fields, guardrail metric inputs
   - gate visibility in experiment history
   - admin rollback form executing `revertIngestionTuningConfig(...)`
   (`app/(studio)/studio/ingestion/page.tsx`).
4. Documented rollback operations/workflow:
   - `docs/specs/ingestion/02_studio_user_workflow.md`
   - `docs/specs/ingestion/15_operations_runbook.md`
   - `docs/specs/ingestion/12_interfaces_and_commands.md`.

Acceptance criteria:
1. Tuning changes cannot bypass sample-size and guardrail checks.
2. Revert path is documented and executable.

Gate C (Epic 4 exit; minimum 28-day evaluation window):
1. rejection rate reduced by >= 20% on tuned sources
2. heavy rewrite share reduced by >= 25%
3. no guardrail regressions

## 11) Epic 5: Production Operations and Governance Maturity

### ING-050: Implement runtime compliance pre-run checks
Dependencies: ING-004, ING-022

Checklist:
- [x] Validate source is active and approved before scheduling/execution.
- [x] Enforce policy TTL on robots/terms checks.
- [x] Auto-pause or degrade sources on compliance failure.

Verification note:
1. Added runtime compliance pre-check engine (`pipeline/src/jobs/runtime-controls.ts`):
   - blocks runs when source is non-active, non-approved, legal-hold, or stale/missing robots/terms checks
   - enforces policy TTL defaults (`robots=7d`, `terms=30d`) with env overrides
     (`INGEST_COMPLIANCE_ROBOTS_TTL_DAYS`, `INGEST_COMPLIANCE_TERMS_TTL_DAYS`)
   - emits structured evidence bundle + bounded compliance alert history metadata.
2. Wired `run-source` to execute compliance checks before run execution (`pipeline/src/jobs/run-source.ts`):
   - blocks before discovery/extraction starts
   - auto-transitions `active -> paused|degraded` on compliance failure via audited RPC
   - persists compliance failure evidence in `metadata_json.compliance.*`
   - `--force` no longer bypasses compliance gates.
3. Extended ingestion runtime data contract:
   - source runtime record now includes `robots_checked_at` and `terms_checked_at`
   (`pipeline/src/durable-store/repository.ts`).
4. Added runtime tests for compliance behavior:
   - stale TTL block path
   - legal-hold critical pause path
   - bounded alert history merge
   (`pipeline/src/jobs/runtime-controls.test.ts`).

Acceptance criteria:
1. Non-compliant sources are blocked before extraction starts.
2. Compliance failure emits alert and explicit state transition.

### ING-051: Build alerting and incident response automation
Dependencies: ING-022, ING-050

Checklist:
- [x] Alert on zero-yield anomaly, failure spikes, schedule misses, rejection-rate surges.
- [x] Define Sev-1/2/3 routing and response expectations.
- [x] Add evidence bundles to incident notifications.

Verification note:
1. Added incident alert automation job and CLI command:
   - `incidentAlerts(sourceKey?)` in `pipeline/src/jobs/incident-alerts.ts`
   - `pipeline:incident-alerts [source_key]` command wiring in `pipeline/src/index.ts`
   - detects: zero-yield anomaly, failure spike, schedule miss, rejection-rate surge, compliance failure.
2. Added severity routing/response contract in runtime alert payloads:
   - Sev-1: oncall + compliance + product (15m ack / 60m mitigation)
   - Sev-2: oncall + source owner (60m ack / 4h mitigation)
   - Sev-3: source owner (4h ack / 24h mitigation).
3. Added evidence bundle persistence for triage:
   - bounded incident alert history in `metadata_json.incidents.alert_history`
   - `last_alerts`, severity counts, and per-alert response SLA data.
4. Added data support for rejection-rate surge detection:
   - source rejection trend aggregation via editor labels + candidate source mapping
   (`pipeline/src/durable-store/repository.ts`).
5. Added tests:
   - `pipeline/src/jobs/incident-alerts.test.ts`
   - runtime suite updated to include incident alert tests.

Acceptance criteria:
1. Incident handlers can triage from alert payload without ad hoc digging.

### ING-052: Implement replay tooling and versioned config controls
Dependencies: ING-031, ING-051

Checklist:
- [x] Replay run by ID using historical config version.
- [x] Record strategy/version IDs in run metadata.
- [x] Validate replay determinism within accepted tolerance.

Verification note:
1. Added replay orchestration job and CLI wiring:
   - `replayRun(runId, options)` in `pipeline/src/jobs/replay-run.ts`
   - `pipeline:replay-run -- <run_id> [--config-version <version>]` in `pipeline/src/index.ts` and `package.json`.
2. Replay now resolves runtime config by `source_config_version` from run metadata:
   - defaults to original run version
   - loads historical config from `ingest_source_registry_audit_events`
   - falls back to current runtime config when version cannot be resolved.
3. `run-source` now persists explicit run version metadata on every run outcome:
   - `meta_json.run_versions.extractor_version`
   - `meta_json.run_versions.strategy_version`
   - `meta_json.run_versions.source_config_version`
   - plus `meta_json.replay.*` context for replay runs and override auditing.
4. Added determinism validation for replay:
   - candidate/curated/quality-filtered delta checks with bounded tolerance
   - candidate-key overlap checks
   - failure reasons included in replay output.
5. Added tests:
   - `pipeline/src/jobs/replay-run.test.ts`
   - runtime suite updated to execute replay determinism tests.

Acceptance criteria:
1. Historical runs can be replayed for forensic analysis and regression checks.

### ING-053: Establish quarterly governance review operation
Dependencies: ING-050, ING-051

Checklist:
- [ ] Create recurring governance review template.
- [ ] Review source portfolio value vs maintenance burden.
- [ ] Track policy updates and required retraining actions.

Acceptance criteria:
1. Governance reviews occur on schedule with documented actions and owners.

Gate D (Epic 5 exit; trailing 30 days unless noted):
1. run success rate >= 99%
2. mean time to recovery < 4 hours
3. sev-1 compliance incidents = 0 (trailing 60 days)

## 12) Recommended Parallelization Plan

After Epic 0:

1. Track A (Runtime): ING-010, ING-011, ING-012
2. Track B (Studio): ING-013
3. Track C (Ops): ING-014

After Epic 1:

1. Track A (Sources): ING-020, ING-021
2. Track B (Reliability): ING-022
3. Track C (Metrics): ING-023

After Epic 2:

1. Track A (Intelligence): ING-030, ING-031
2. Track B (Lifecycle): ING-032, ING-033

After Epic 3:

1. Track A (Studio Labels): ING-040
2. Track B (Analytics): ING-041, ING-042
3. Track C (Deployment Safety): ING-043

After Epic 4:

1. Track A (Compliance): ING-050
2. Track B (SRE): ING-051, ING-052
3. Track C (Governance): ING-053

## 13) Immediate Next 10 Tasks

1. [x] ING-001
2. [x] ING-002
3. [x] ING-003
4. [x] ING-004
5. [x] ING-005
6. [x] ING-010
7. [x] ING-011
8. [x] ING-012
9. [x] ING-013
10. [x] ING-014
