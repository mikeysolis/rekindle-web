# Ingestion System Usage Guide (v1)
_Last updated: 2026-03-01_

## 1) Purpose

This guide explains how to actually operate the ingestion system day to day:

1. local environment setup
2. running pipeline commands
3. reviewing candidates in Studio
4. source onboarding and governance actions
5. troubleshooting common failures

Use this with:

1. `14_environment_and_secrets_contract.md` (env rules)
2. `12_interfaces_and_commands.md` (command contract)
3. `15_operations_runbook.md` (incident/recovery procedures)

## 2) User Types and Responsibilities

1. Ingestion operator:
   - runs source jobs and health checks
   - handles replay, incidents, and cleanup
2. Editor:
   - reviews candidates in Studio
   - rejects, marks needs work, promotes to draft
3. Admin:
   - manages source lifecycle and tuning rollouts
   - owns policy/governance workflows

## 3) Environment Setup (Local)

### 3.1 Prerequisites

1. Node/npm installed (project uses Volta pinning in `package.json`)
2. Supabase CLI installed
3. Docker running (for local Supabase instances)
4. Repo dependencies installed:

```bash
npm install
```

### 3.2 Start databases

App DB (studio stack):

```bash
npm run supabase:start
```

Ingestion DB (pipeline stack):

```bash
npm run ingest:supabase:start
```

### 3.3 Validate stack health

```bash
supabase status --workdir ./db
supabase status --workdir ./ingestion
```

### 3.4 Configure environment variables

At minimum for pipeline runtime:

1. `INGEST_SUPABASE_URL`
2. `INGEST_SUPABASE_SERVICE_ROLE_KEY`

For reconciliation (cross-DB):

1. `APP_SUPABASE_URL`
2. `APP_SUPABASE_SERVICE_ROLE_KEY`

Validate:

```bash
node scripts/validate-env.mjs --runtime studio
node scripts/validate-env.mjs --runtime pipeline
node scripts/validate-env.mjs --runtime pipeline-reconcile
```

## 4) First-Run Quick Start

Use this when bootstrapping a local session.

1. List available source keys:

```bash
npm run pipeline:list-sources
```

2. Check source health status:

```bash
npm run pipeline:source-health
```

3. Run one source manually:

```bash
npm run pipeline:run-source -- rak --force
```

4. Open Studio and review ingestion inbox:
   - `Studio > Ingestion`

5. Run incident scan:

```bash
npm run pipeline:incident-alerts
```

## 5) Pipeline Command Workflows

### 5.1 Run a source now

Normal manual run:

```bash
npm run pipeline:run-source -- <source_key>
```

Respect cadence window:

```bash
npm run pipeline:run-source -- <source_key> --respect-cadence
```

Bypass cadence only:

```bash
npm run pipeline:run-source -- <source_key> --force
```

Expected output fields include:

1. `runId`
2. `sourceKey`
3. `discoveredPages`
4. `candidateCount`
5. `curatedCandidateCount`
6. `snapshotLocation`

### 5.2 Replay a historical run

Default replay (uses original run config version):

```bash
npm run pipeline:replay-run -- <run_id>
```

Replay with config override attempt:

```bash
npm run pipeline:replay-run -- <run_id> --config-version <version>
```

Expected replay output fields:

1. `originalRunId`
2. `replayRunId`
3. `requestedConfigVersion`
4. `resolvedConfigVersion`
5. `configResolvedFrom`
6. `determinism` (pass/fail + failure reasons)
7. `warnings` (for fallback/override behavior)

### 5.3 Health and incidents

Source health:

```bash
npm run pipeline:source-health
npm run pipeline:source-health -- rak
```

Incident alerts:

```bash
npm run pipeline:incident-alerts
npm run pipeline:incident-alerts -- rak
```

### 5.4 Onboard a candidate source

Probe and generate recommendation:

```bash
npm run pipeline:source-probe -- https://example.org
```

Probe with explicit metadata:

```bash
npm run pipeline:source-probe -- https://example.org \
  --source-key example_org \
  --display-name "Example Org" \
  --owner-team ingestion \
  --approval-action pending_review
```

### 5.5 Reconcile promotions (ingestion <-> app)

```bash
npm run pipeline:reconcile-promotions
```

Use when draft linkage/status drift is suspected.

## 6) Studio Usage Workflow

### 6.1 Editor review flow

1. Open `Studio > Ingestion`.
2. Filter by source/status/date/duplicate risk.
3. Open candidate details and inspect:
   - source URL
   - excerpt
   - quality flags
   - traits
4. Apply one action:
   - Reject
   - Needs Work
   - Promote to Draft
5. Continue draft workflow in Studio after promotion.

### 6.2 Required labeling behavior

Editors should always provide required structured fields when prompted:

1. reject reason code
2. rewrite severity
3. duplicate confirmation

These fields drive analytics and tuning quality.

### 6.3 Admin source lifecycle actions

In `Studio > Ingestion` admin controls:

1. Reactivate source (`paused|degraded -> active`)
2. Retire source (`active|degraded|paused -> retired`)
3. Record reason/approvals in every lifecycle action

### 6.4 Admin tuning operations

1. Record experiment metadata and rollout evidence
2. Validate guardrails before full adopt
3. Use rollback action if regressions occur

## 7) Data Cleanup and Reset Usage

Preferred cleanup (truncate ingestion runtime tables, keep source registry):

1. print cleanup SQL:

```bash
npm run ingest:cleanup:sql
```

2. run SQL from:
   - `ingestion/supabase/sql/cleanup_ingestion_tables.sql`

Full reset (last resort only):

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- \
  --allow-local-reset --environment local --confirm reset-local --dry-run
```

Never run linked reset against production projects.

## 8) Common Failure Patterns and What to Do

1. Compliance pre-run blocked (`robots`/`terms` missing or stale):
   - update source registry compliance timestamps
   - verify source is `active` and `approved_for_prod=true`
2. Replay determinism fails:
   - inspect `determinism.failureReasons`
   - compare snapshots between original/replay
   - create tuning or parser follow-up
3. Connectivity errors (`fetch failed`, no run rows):
   - validate env vars
   - confirm `supabase status` for target workdir
4. Promotion drift:
   - run `npm run pipeline:reconcile-promotions`
   - verify candidate status + sync log

Escalation procedures are in `15_operations_runbook.md`.

## 9) Operational Rhythm

Daily (operator):

1. run `pipeline:source-health`
2. review `pipeline:incident-alerts`
3. run targeted source jobs/replays as needed

Weekly (operator + editorial):

1. review source yield/quality trends in Studio
2. triage high-burden or low-value sources

Quarterly (governance):

1. execute `16_quarterly_governance_review_operation.md`
2. publish completed review record with owners and due dates

## 10) Recommended Verification Before Commit

Pipeline/runtime changes:

```bash
npm run pipeline:test:rak
npm run pipeline:test:sources
npm run pipeline:test:quality
npm run pipeline:test:runtime
npm run pipeline:test:source-probe
npm run pipeline:test:reconcile
```

Studio/app changes:

1. run `npx tsc --noEmit`
2. run `npx next build --webpack`

## 11) Reference Paths

1. Ingestion specs root: `docs/specs/ingestion/`
2. Pipeline code: `pipeline/src/`
3. Ingestion migrations: `ingestion/supabase/migrations/`
4. Cleanup SQL: `ingestion/supabase/sql/cleanup_ingestion_tables.sql`
