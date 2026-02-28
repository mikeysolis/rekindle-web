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
- [ ] Update runbook/CLI docs to require explicit confirmation for linked remote reset.
- [ ] Add ingestion-only cleanup SQL path as default operational path.
- [ ] Add environment verification step before any full reset command.

Acceptance criteria:
1. Routine cleanup path never requires full DB reset.
2. Remote reset is blocked by default without explicit override and environment confirmation.

Gate for Epic 0:
1. Contract docs and runtime constraints are aligned with no unresolved blockers for Epic 1.

## 7) Epic 1: Stabilize Current Ingestion Loop

### ING-010: Harden RAK extractor for idea precision
Dependencies: ING-002

Checklist:
- [ ] Refine discovery selectors/patterns to prioritize actionable idea content.
- [ ] Enforce canonical per-item `source_url` capture (no list-page URL reuse).
- [ ] Add source-specific cleaning heuristics to reduce article-style noise.
- [ ] Add extractor fixture tests for positive and negative samples.

Acceptance criteria:
1. `source_url` points to the actual item page for >= 95% of new candidates.
2. Fixture tests fail on regressions and pass in CI.

### ING-011: Add baseline pre-inbox quality rules
Dependencies: ING-010

Checklist:
- [ ] Add deterministic filters for non-idea content.
- [ ] Add duplicate candidate hints based on candidate key/similarity.
- [ ] Add minimum quality threshold with explainable rejection flags.

Acceptance criteria:
1. Noise candidates are reduced without lowering valid idea yield.
2. Every machine-filtered candidate records reason metadata.

### ING-012: Complete promotion consistency and reconciliation flow
Dependencies: ING-003

Checklist:
- [ ] Implement write order and failure semantics from `04_data_model_and_contracts.md`.
- [ ] Implement hourly reconciliation job for cross-DB repair.
- [ ] Emit reconciliation metrics and alert on spikes.

Acceptance criteria:
1. Promotion remains idempotent under retries.
2. Reconciliation repairs desync cases and logs all fixes.

### ING-013: Improve Studio inbox evidence and duplicate awareness
Dependencies: ING-011, ING-012

Checklist:
- [ ] Show raw excerpt, source URL, and quality flags in detail view.
- [ ] Show duplicate hints with link to existing draft/candidate.
- [ ] Add filters for source, status, confidence, duplicate risk, date.

Acceptance criteria:
1. Editors can triage and decide without leaving Studio for most candidates.
2. Duplicate-caused mistaken promotions are measurably reduced.

### ING-014: Add runbook coverage for replay and cleanup
Dependencies: ING-005, ING-012

Checklist:
- [ ] Document replay flow by run ID.
- [ ] Document ingest-table truncate workflow.
- [ ] Document failure-response steps for common ingestion incidents.

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
- [ ] Enforce `discover`, `extract`, `health_check` contract.
- [ ] Build reusable fixture runner for source modules.
- [ ] Add contract tests for output shape and metadata completeness.

Acceptance criteria:
1. New source modules can be added using shared scaffolding and tests.

### ING-021: Implement Tier-1 source modules
Dependencies: ING-020

Checklist:
- [ ] Add `ggia` module.
- [ ] Add `dosomething` module.
- [ ] Add `action_for_happiness` module (ICS-first where available).
- [ ] Add `red_cross_pdf` module.

Acceptance criteria:
1. Each module passes contract tests and produces candidates in staging.
2. Source attribution and extraction metadata are complete for all modules.

### ING-022: Add per-source runtime controls
Dependencies: ING-020

Checklist:
- [ ] Implement cadence, rate limit, and concurrency controls by source.
- [ ] Add per-source timeout and retry budgets.
- [ ] Add source-level health scoring.

Acceptance criteria:
1. A failing source cannot starve or destabilize other active sources.
2. Source health view shows actionable failure and yield signals.

### ING-023: Add source portfolio visibility
Dependencies: ING-021, ING-022

Checklist:
- [ ] Dashboard: accepted ideas per source.
- [ ] Dashboard: source precision proxy and maintenance burden.
- [ ] Dashboard: freshness and diversity contribution.

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
- [ ] Probe root/list pages and detect structure patterns.
- [ ] Generate recommended strategy ladder and confidence.
- [ ] Save onboarding report with operator approval action.

Acceptance criteria:
1. New source onboarding can be completed with a repeatable operator workflow.

### ING-031: Implement strategy selection engine and fallback ladder
Dependencies: ING-030

Checklist:
- [ ] Select best strategy from configured order by reliability/cost/risk.
- [ ] Fallback automatically when primary strategy fails.
- [ ] Persist selected strategy and reason in run metadata.

Acceptance criteria:
1. Strategy decisions are explainable and replayable from logs.
2. Fallback behavior improves run resilience on partial source breakage.

### ING-032: Implement source lifecycle automation hooks
Dependencies: ING-004, ING-031

Checklist:
- [ ] Auto-mark sources degraded on sustained failure/quality drop.
- [ ] Downgrade cadence in degraded state.
- [ ] Trigger operator alert with evidence bundle.

Acceptance criteria:
1. Lifecycle state changes follow allowed transitions only.
2. Degraded sources reduce operational impact without full system interruption.

### ING-033: Implement source reactivation and retirement workflows
Dependencies: ING-032

Checklist:
- [ ] Add explicit review flow to reactivate paused/degraded sources.
- [ ] Add retirement flow with reason and archival metadata.
- [ ] Ensure terminal behavior for retired sources.

Acceptance criteria:
1. Reactivation/retirement actions are auditable and policy-compliant.

Gate for Epic 3:
1. Source onboarding and breakage response are repeatable with low manual ambiguity.

## 10) Epic 4: Learning Loop and Experimentation

### ING-040: Capture structured editorial labels in Studio
Dependencies: ING-003, ING-013

Checklist:
- [ ] Add required fields to reject/promote/needs-work flows.
- [ ] Standardize rejection reason taxonomy in UI.
- [ ] Persist label events to `ingest_editor_labels`.

Acceptance criteria:
1. >= 95% of reviewed candidates produce complete label rows.
2. Label schema matches analytics contract exactly.

### ING-041: Build label processing and quality analytics pipeline
Dependencies: ING-040

Checklist:
- [ ] Join labels with extraction metadata and source registry.
- [ ] Compute per-source/per-strategy KPI slices.
- [ ] Publish 7/30/90 day trend outputs.

Acceptance criteria:
1. Dashboards expose promotion, rejection reasons, rewrite burden, duplicate-confirmed rate.

### ING-042: Implement experiment framework and tuning history
Dependencies: ING-041

Checklist:
- [ ] Create experiment records for each tuning change.
- [ ] Store baseline/treatment metrics in `ingest_experiment_metrics`.
- [ ] Record deployed config changes in `ingest_tuning_changes`.

Acceptance criteria:
1. Every tuning rollout has a linked hypothesis, result, and adopt/revert decision.

### ING-043: Add safe tuning deployment workflow
Dependencies: ING-042

Checklist:
- [ ] Add canary/shadow execution mode.
- [ ] Enforce sample-size gate:
  - control and treatment each >= 200 reviewed candidates
  - or >= 14 days, whichever is longer
- [ ] Block rollout if guardrail metrics regress.

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
- [ ] Validate source is active and approved before scheduling/execution.
- [ ] Enforce policy TTL on robots/terms checks.
- [ ] Auto-pause or degrade sources on compliance failure.

Acceptance criteria:
1. Non-compliant sources are blocked before extraction starts.
2. Compliance failure emits alert and explicit state transition.

### ING-051: Build alerting and incident response automation
Dependencies: ING-022, ING-050

Checklist:
- [ ] Alert on zero-yield anomaly, failure spikes, schedule misses, rejection-rate surges.
- [ ] Define Sev-1/2/3 routing and response expectations.
- [ ] Add evidence bundles to incident notifications.

Acceptance criteria:
1. Incident handlers can triage from alert payload without ad hoc digging.

### ING-052: Implement replay tooling and versioned config controls
Dependencies: ING-031, ING-051

Checklist:
- [ ] Replay run by ID using historical config version.
- [ ] Record strategy/version IDs in run metadata.
- [ ] Validate replay determinism within accepted tolerance.

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

1. [ ] ING-001
2. [ ] ING-002
3. [ ] ING-003
4. [ ] ING-004
5. [ ] ING-005
6. [ ] ING-010
7. [ ] ING-011
8. [ ] ING-012
9. [ ] ING-013
10. [ ] ING-014
