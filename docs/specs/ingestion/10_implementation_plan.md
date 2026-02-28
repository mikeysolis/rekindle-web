# Ingestion Implementation Plan (v1)
_Last updated: 2026-02-28_

## 1) Planning Intent

Deliver a staged path from current ingestion scaffold to a robust, multi-source, continuously improving ingestion platform.

## 2) Current Baseline

Already implemented:

1. Durable ingestion schema (`ingest_*` tables)
2. Basic source runner and `rak` extractor
3. Studio ingestion inbox routes
4. Manual promote/reject/needs-work actions
5. Idempotent draft linkage via `ingest_candidate_id`

## 3) Phase Plan

## Phase 0: Stabilize Current Loop (1-2 weeks)

Goals:

1. improve candidate quality from initial sources
2. reduce obvious noise before inbox
3. ensure run/review/promote reliability

Work:

1. harden `rak` discovery and extraction
2. add baseline quality rule packs
3. add duplicate hints in inbox detail
4. runbook docs for replay and reset

Exit criteria:

1. at least one source producing consistent promotable ideas
2. inbox quality acceptable for daily editor use

## Phase 1: Multi-Source Expansion (2-4 weeks)

Goals:

1. onboard additional Tier 1 sources
2. standardize source module interface and tests
3. improve source-specific controls

Work:

1. implement source modules:
   - `ggia`
   - `dosomething`
   - `action_for_happiness` (ICS first)
   - `red_cross_pdf`
2. create source registry config with cadence/rate limits
3. add per-source health scoring

Exit criteria:

1. 4-6 active sources with stable scheduled runs
2. source-level acceptance and failure metrics visible

## Phase 2: Source Intelligence Layer (2-4 weeks)

Goals:

1. systematic source onboarding
2. strategy recommendation and breakage fallback

Work:

1. onboarding probe service (structure detection)
2. strategy selection engine and fallback ladder
3. source lifecycle states and governance checks

Exit criteria:

1. source onboarding playbook is repeatable
2. degraded source auto-detection in place

## Phase 3: Learning Loop v1 (2-4 weeks)

Goals:

1. capture high-quality editorial labels
2. close feedback loop for tuning

Work:

1. structured rejection reason taxonomy
2. label ingestion pipeline
3. dashboards for quality outcomes
4. automated rule-change suggestion reports

Exit criteria:

1. measurable reduction in rejection rate for tuned sources
2. measurable reduction in manual rewrite burden

## Phase 4: Production Ops Maturity (2-4 weeks)

Goals:

1. scale and reliability for business-critical operation
2. incident readiness and compliance maturity

Work:

1. alerting and incident runbooks
2. replay tooling and versioned extraction configs
3. compliance dashboard and quarterly governance review flow

Exit criteria:

1. predictable operations with low unplanned downtime
2. auditable and policy-compliant ingestion at scale

## 4) Team Responsibilities

1. Ingestion Platform Engineer:
   - workers, strategy modules, scheduling, reliability.
2. Studio Engineer:
   - inbox UX, review actions, feedback capture.
3. Editorial Operations:
   - review quality and taxonomy consistency.
4. Product Owner:
   - prioritize source portfolio and KPI targets.

## 5) Technical Milestones and Gates

Gate A:

1. run success rate >= 95% over trailing 14 days
2. promotion rate >= 10% on at least one active source
3. duplicate-confirmed rate <= 15%
4. no direct publish path from ingestion

Gate B:

1. schedule adherence >= 97% over trailing 14 days
2. run success rate >= 97% over trailing 14 days
3. source health metrics complete
4. at least 4 active sources produce accepted ideas weekly

Gate C:

1. rejection rate reduced by >= 20% vs baseline (28-day window)
2. heavy rewrite share reduced by >= 25% vs baseline
3. no guardrail regression (safety flags, duplicate rate, compliance incidents)

Gate D:

1. run success rate >= 99% over trailing 30 days
2. MTTR < 4 hours over trailing 30 days
3. sev-1 compliance incidents = 0 over trailing 60 days
4. reliability and governance standards pass

## 6) Risk Register

1. Source structure churn:
   - mitigation: fallback strategies + health alerts.
2. Legal/compliance risk:
   - mitigation: source approvals + strict attribution.
3. Editorial overload:
   - mitigation: ranking, gating, bulk triage.
4. Data quality regressions:
   - mitigation: canary tuning and experiment framework.

## 7) Immediate Next Tasks

Execution checklist reference:

1. Use `13_execution_backlog.md` as the task-level execution tracker.

Priority start tasks:

1. `ING-001` lock remaining policy/architecture decisions.
2. `ING-002` finalize environment and secret namespace contract.
3. `ING-003` add required learning/experiment tables.
4. `ING-004` implement source registry schema + lifecycle audit controls.
5. `ING-005` enforce destructive-command safety guardrails.
