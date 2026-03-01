# Interfaces and Commands (v1)

## 1) CLI Interface (Pipeline Runtime)

Current commands:

1. `pipeline:list-sources`
2. `pipeline:run-source -- <source_key>`
3. `pipeline:source-health [source_key]`
4. `pipeline:source-probe -- <url_or_domain>`
5. `pipeline:reconcile-promotions`

Planned commands:

1. `pipeline:run-all`
2. `pipeline:run-source -- <source_key> --mode incremental|full|replay`
3. `pipeline:replay-run -- <run_id>`

## 2) Scheduler Interface

Required scheduler capabilities:

1. run by source and cadence
2. enforce max concurrent runs
3. enqueue retries with backoff
4. manual rerun triggers by source/run ID

## 3) Studio Service Interfaces

Core Studio ingestion service functions:

1. `listIngestionCandidates(filters)`
2. `getIngestionCandidateDetail(candidateId)`
3. `rejectIngestionCandidate({candidateId, actorUserId, note, rejectReasonCode, duplicateConfirmed})`
4. `markIngestionCandidateNeedsWork({candidateId, actorUserId, note, rewriteSeverity, duplicateConfirmed})`
5. `promoteIngestionCandidateToDraft({candidateId, actorUserId, rewriteSeverity, duplicateConfirmed, promotedAfterEdit})`
6. `listIngestionLabelQualityAnalytics(windowDays)`
7. `createIngestionTuningExperiment(input)`
8. `listIngestionExperimentRollouts(limit)`
9. `reactivateIngestionSource({sourceKey, actorUserId, reason, productOwnerApproved, complianceAcknowledged})`
10. `retireIngestionSource({sourceKey, actorUserId, reason, productOwnerApproved, complianceAcknowledged, archivalReference, archivalSummary})`

## 4) Suggested API Contract Shapes

Candidate list response:

1. `items[]`
2. `total`
3. `cursor` (optional for pagination)
4. `aggregates` (status/source counts, optional)

Candidate detail response:

1. `candidate`
2. `traits[]`
3. `syncLog[]`
4. `duplicateHints[]` (planned)

Promotion response:

1. `draftId`
2. `created`
3. `warnings[]`

## 5) Event and Logging Interface

Standard event payload should include:

1. `event_type`
2. `source_key`
3. `run_id`
4. `page_id` (nullable)
5. `candidate_id` (nullable)
6. `status`
7. `duration_ms`
8. `error_code` and `error_message` (if failed)

## 6) Metric Emission Interface

Every run should emit:

1. discovered pages count
2. extracted candidate count
3. rejected-by-gate count
4. error counts by category
5. output snapshot location

## 7) Operational Command Set

App DB migrations:

1. `supabase db push --workdir ./db`

Ingestion DB migrations:

1. `supabase db push --workdir ./ingestion`

Ingestion DB local reset:

1. `INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- --allow-local-reset --environment local --confirm reset-local`

Ingestion remote reset (linked project, full reset):

1. `INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- --allow-linked-reset --environment staging --confirm reset-staging`

Safety rule:

1. Never run linked remote reset against production projects.
2. Require explicit human approval and environment confirmation before any remote reset.
3. Require `INGEST_ENVIRONMENT` to match `--environment` before any full reset.
4. Prefer ingestion-table truncate for routine cleanup instead of full DB reset.
5. Use `--dry-run` first for reset commands.

Routine ingestion-only cleanup (preferred):

1. Print cleanup SQL:
   - `npm run ingest:cleanup:sql`
2. Run SQL from `ingestion/supabase/sql/cleanup_ingestion_tables.sql` against ingestion DB.

## 8) Interface Versioning

Use explicit versioning for:

1. strategy module behavior
2. quality scoring logic
3. candidate schema extensions
4. Studio service response shapes

Every version change should be represented in logs and run metadata.
