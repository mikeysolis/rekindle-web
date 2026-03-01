# Ingestion Operations Runbook (v1)
_Last updated: 2026-03-01_

## 1) Purpose

Define repeatable, low-risk procedures for:

1. replaying ingestion by run ID
2. truncating ingestion tables safely
3. handling common ingestion incidents
4. performing guarded full resets only when necessary

## 2) Safety Rules

1. Prefer replay and ingestion-table cleanup before full reset.
2. Never run linked reset against production-like environments.
3. For any full reset command, require:
   - explicit override flag
   - explicit environment confirmation token
   - `INGEST_ENVIRONMENT` match with `--environment`
4. Run `--dry-run` first before executing any reset command.
5. Record incident/work item ID and operator in run notes before destructive actions.

## 3) Preflight Checklist

1. Confirm which ingestion target you are operating on:
   - local ingestion stack (`supabase start --workdir ./ingestion`)
   - linked remote ingestion project (`--linked --workdir ./ingestion`)
2. Validate environment contract:

```bash
node scripts/validate-env.mjs --runtime pipeline
node scripts/validate-env.mjs --runtime pipeline-reconcile
```

3. If using local ingestion, verify ports/credentials:

```bash
supabase status --workdir ./ingestion
```

4. If you need cleanup SQL content:

```bash
npm run ingest:cleanup:sql
```

## 4) Replay Flow by Run ID

Use this flow when extractor logic changed or a run had partial/failed behavior and you need a controlled replay.

### 4.1 Identify Original Run

```sql
select
  id,
  source_key,
  status,
  started_at,
  finished_at,
  meta_json->>'snapshot_location' as snapshot_location
from public.ingest_runs
where id = '<RUN_ID>';
```

Expected:

1. one row returned
2. `source_key` is present
3. optionally capture `snapshot_location` for forensic diff

### 4.2 Capture Baseline Before Replay

```sql
select
  status,
  count(*) as run_count
from public.ingest_runs
where source_key = '<SOURCE_KEY>'
  and started_at >= now() - interval '24 hours'
group by status
order by status;
```

```sql
select
  count(*) as candidate_count
from public.ingest_candidates
where run_id = '<RUN_ID>';
```

### 4.3 Execute Replay

Replay runs the source again using current extraction/quality logic.

```bash
npm run pipeline:run-source -- <SOURCE_KEY>
```

Save the new `runId` from command output.

### 4.4 Verify Replay Outcome

```sql
select
  id,
  source_key,
  status,
  started_at,
  finished_at,
  meta_json
from public.ingest_runs
where source_key = '<SOURCE_KEY>'
order by started_at desc
limit 3;
```

```sql
select
  status,
  count(*) as candidate_count
from public.ingest_candidates
where run_id = '<NEW_RUN_ID>'
group by status
order by status;
```

If replay still fails or quality is poor, open tuning work and include both run IDs (`original`, `replay`).

## 5) Ingest-Table Truncate Workflow (Preferred Cleanup)

Use when you want to clear run/page/candidate data while preserving source registry configuration.

Affected tables (from `ingestion/supabase/sql/cleanup_ingestion_tables.sql`):

1. `ingest_sync_log`
2. `ingest_candidate_traits`
3. `ingest_editor_labels`
4. `ingest_candidates`
5. `ingest_pages`
6. `ingest_runs`

### 5.1 Local Ingestion Cleanup

1. Ensure local ingestion stack is running:

```bash
npm run ingest:supabase:start
```

2. Apply cleanup SQL to local ingestion DB:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:55322/postgres" \
  -f ingestion/supabase/sql/cleanup_ingestion_tables.sql
```

3. Verify cleanup and preserved registry:

```sql
select count(*) as runs from public.ingest_runs;
select count(*) as candidates from public.ingest_candidates;
select count(*) as source_registry_rows from public.ingest_source_registry;
```

### 5.2 Linked Ingestion Cleanup

1. Print SQL for operator review:

```bash
npm run ingest:cleanup:sql
```

2. Execute same SQL in linked project SQL editor (or approved SQL execution path).
3. Run the same verification queries as local cleanup.

## 6) Full Reset Procedures (Last Resort)

Only use when schema or local state is irrecoverably inconsistent.

### 6.1 Full Local Reset

Dry-run:

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- \
  --allow-local-reset --environment local --confirm reset-local --dry-run
```

Execute:

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- \
  --allow-local-reset --environment local --confirm reset-local
```

### 6.2 Full Linked Reset (Staging/Test Only)

Dry-run:

```bash
INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- \
  --allow-linked-reset --environment staging --confirm reset-staging --dry-run
```

Execute:

```bash
INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- \
  --allow-linked-reset --environment staging --confirm reset-staging
```

Hard blocks:

1. linked reset is blocked for `prod`, `production`, `live`
2. reset blocked when `INGEST_ENVIRONMENT` and `--environment` differ

## 7) Common Incident Response Playbooks

Each incident includes detection, immediate mitigation, diagnosis, and recovery.

### 7.1 Source Extraction Broke After Site Change

Detection:

1. run failures spike for one `source_key`
2. candidate yield drops to zero for normally productive source

Immediate mitigation:

1. pause scheduled runs for affected source (or stop manual reruns)
2. run one controlled `pipeline:run-source` to capture current failure evidence

Diagnosis:

1. inspect `ingest_pages.error_text` for top failing URLs
2. compare latest and prior successful run snapshots (`snapshot_location`)
3. confirm selector/structure drift in source HTML

Recovery:

1. patch extractor/parser
2. run replay flow by run ID (Section 4)
3. verify candidate quality and source URL integrity in Studio inbox

### 7.2 Ingestion DB Connectivity Failure

Detection:

1. pipeline command fails early with Supabase client fetch/connect errors
2. no new `ingest_runs` rows written

Immediate mitigation:

1. verify credentials with `node scripts/validate-env.mjs --runtime pipeline`
2. for local stacks, run `supabase status --workdir ./ingestion`

Diagnosis:

1. confirm `INGEST_SUPABASE_URL` and key target intended environment
2. verify local Docker services healthy (if local mode)
3. validate no accidental app/ingestion URL collision

Recovery:

1. restore connectivity
2. run controlled `pipeline:run-source`
3. if promotion desync suspected, run `pipeline:reconcile-promotions`

### 7.3 Promotion/Reconciliation Desync

Detection:

1. drafts exist with `ingest_candidate_id` but candidate status not `pushed_to_studio`
2. missing or failed `ingest_sync_log` records for promoted rows

Immediate mitigation:

1. run reconciliation job:

```bash
npm run pipeline:reconcile-promotions
```

Diagnosis:

1. inspect reconciliation output counts (`planned*`, `repaired*`, `failed*`)
2. review sync log entries for affected candidates

Recovery:

1. rerun reconciliation until `failed*` counters are zero
2. if failures persist, resolve credential/network issue and rerun

### 7.4 Duplicate Explosion in Inbox

Detection:

1. elevated duplicate flags (`duplicate_candidate_key_existing`)
2. editors report many near-identical candidates

Immediate mitigation:

1. keep inbox filtered to `curated` by default
2. prioritize likely duplicate rows using duplicate-risk filter

Diagnosis:

1. inspect source-level candidate key patterns
2. review recent extractor changes and URL normalization behavior
3. check for source listing loops or URL canonicalization regressions

Recovery:

1. patch source module dedupe/canonical URL logic
2. replay affected source and re-check duplicate rate
3. reject stale duplicate candidates in Studio as needed

### 7.5 Low-Quality Surge in Inbox

Detection:

1. increased `normalized`/filtered ratio
2. editor rejection or heavy rewrite burden increases

Immediate mitigation:

1. keep low-confidence and likely-duplicate filters active during triage
2. temporarily reduce run frequency for affected sources if editor load is high

Diagnosis:

1. inspect quality flags in candidate detail
2. compare run-level quality counts in `ingest_runs.meta_json`
3. identify source-specific failure patterns

Recovery:

1. tune quality rules and extractor cleanup heuristics
2. replay source after tuning
3. confirm confidence and promotion rate recovery over subsequent runs

### 7.6 Tuning Rollout Guardrail Regression

Detection:

1. full `adopt` rollout blocked in Studio with guardrail regression message
2. duplicate/safety/compliance guardrail metric worsens in canary

Immediate mitigation:

1. halt additional rollouts for the source
2. execute Studio rollback action with last known good config patch

Recovery:

1. open `Studio > Ingestion > Experiment & Tuning History`
2. run `Rollback Tuning Config` with rollback reason and patch JSON
3. confirm new config version in success banner and source audit trail
4. record follow-up experiment as `revert` decision if needed

## 8) Post-Incident Closure

1. Record incident summary and affected run IDs.
2. Record commands executed and outcomes.
3. Link code/doc changes made during recovery.
4. Add follow-up tasks to ingestion backlog if a contract gap was found.
