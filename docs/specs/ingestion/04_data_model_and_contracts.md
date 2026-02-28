# Data Model and Contracts (v1)

## 1) Data Store Separation

1. Durable Ingestion DB:
   - machine-facing lifecycle state
   - raw evidence and extraction metadata
   - sync/audit logs

2. App DB:
   - editorial draft workflow
   - publish workflow

## 2) Durable Ingestion Tables

Current canonical ingestion tables:

1. `ingest_runs`
2. `ingest_pages`
3. `ingest_candidates`
4. `ingest_candidate_traits`
5. `ingest_sync_log`

## 3) App Tables Involved in Promotion

1. `idea_drafts`
2. `idea_draft_traits`

Recommended app linkage field:

- `idea_drafts.ingest_candidate_id` with unique index (idempotent promotion key)

## 4) Candidate Status Contract

Allowed statuses:

1. `new`
2. `normalized`
3. `curated`
4. `pushed_to_studio`
5. `exported`
6. `rejected`

Semantics:

1. Machine pipeline should only set `new`, `normalized`, `curated`.
2. Studio actions set `rejected`, `pushed_to_studio`.
3. Downstream publish/export can set `exported`.

## 5) Required Candidate Fields

Minimum fields required for Studio review:

1. `id`
2. `source_key`
3. `source_url`
4. `title`
5. `description` (nullable)
6. `raw_excerpt` (nullable, short)
7. `status`
8. `candidate_key` (dedupe key)
9. `meta_json`
10. `created_at`, `updated_at`

## 6) Candidate Trait Hint Contract

Trait hints are optional and probabilistic.

Required:

1. `trait_type_slug`
2. `trait_option_slug`

Optional:

1. `confidence`
2. `source` (rule/model/human)

## 7) Sync Log Contract

Every cross-system action should write `ingest_sync_log`:

1. `candidate_id`
2. `target_system` (`app_draft`, `app_draft_filter`, etc.)
3. `target_id` (nullable)
4. `status` (`pending|success|failed`)
5. `error_text` (nullable)
6. timestamp (`synced_at`)

## 8) Promotion Contract (Ingestion -> Draft)

Input:

1. `candidate_id`
2. `actor_user_id`

Behavior:

1. If draft already exists by `ingest_candidate_id`, return existing draft ID.
2. Else create new draft with mapped fields.
3. Copy resolvable trait hints into `idea_draft_traits`.
4. Set candidate status `pushed_to_studio`.
5. Write sync log success/failure.

Output:

1. `draft_id`
2. `created` boolean
3. `warnings[]` (non-fatal mapping issues)

## 8.1) Cross-DB Consistency Contract (Required)

Because promotion writes to two databases, the implementation must treat consistency explicitly.

Promotion write order:

1. Insert `ingest_sync_log` with `status='pending'` for target system `app_draft`.
2. Upsert/create draft in app DB keyed by `idea_drafts.ingest_candidate_id`.
3. Sync draft traits (best effort with warnings surfaced to caller).
4. Update `ingest_candidates.status='pushed_to_studio'`.
5. Mark `ingest_sync_log.status='success'` with `target_id=draft_id`.

Failure handling:

1. If app draft write fails:
   - mark sync log `failed`
   - keep candidate status unchanged
2. If app draft write succeeds but ingestion DB status/log update fails:
   - return success with warning
   - reconciliation job must repair ingestion state

Canonical promotion truth:

1. App DB `idea_drafts.ingest_candidate_id` is the idempotency key.
2. Ingestion sync log is the operational audit trail.
3. Candidate status is a convenience projection and may lag until reconciliation.

## 8.2) Reconciliation Job Contract

Run at least hourly:

1. Find drafts with non-null `ingest_candidate_id` where candidate status is not `pushed_to_studio`.
2. Backfill/repair `ingest_sync_log` success row if missing.
3. Repair candidate status to `pushed_to_studio`.
4. Emit reconciliation metrics and alert if repair volume spikes.

## 9) Source Metadata Contract

`meta_json` should include:

1. extraction strategy (`detail_page`, `api`, `sitemap`, etc.)
2. source evidence pointers (selector path, node key, document region)
3. quality flags and model/rule versions

## 10) Idempotency and Uniqueness

1. Candidate uniqueness:
   - `candidate_key` unique on normalized source identity + text identity.
2. Promotion uniqueness:
   - `idea_drafts.ingest_candidate_id` unique where not null.
3. Trait uniqueness:
   - one row per `(candidate_id, trait_type_slug, trait_option_slug)`.

## 11) Data Retention

1. Keep raw candidates for replay and auditing.
2. Keep sync log indefinitely or with long retention window.
3. Keep snapshots per run in JSONL/object storage.

## 11.1) Learning and Experiment Tables (Required for Phase 3+)

Add dedicated ingestion analytics tables:

1. `ingest_editor_labels`
   - `candidate_id`
   - `action` (`promoted|promoted_after_edit|rejected|needs_work`)
   - `reject_reason_code` (nullable)
   - `rewrite_severity` (`light|moderate|heavy`, nullable)
   - `duplicate_confirmed` (nullable boolean)
   - `actor_user_id`
   - `created_at`
2. `ingest_experiments`
   - `id`, `name`, `hypothesis`, `scope_json`
   - `status` (`planned|running|completed|aborted`)
   - `started_at`, `ended_at`
3. `ingest_experiment_metrics`
   - `experiment_id`
   - `metric_name`
   - `baseline_value`
   - `treatment_value`
   - `delta_value`
4. `ingest_tuning_changes`
   - `source_key`
   - `config_version`
   - `change_json`
   - `approved_by`
   - `applied_at`

## 12) Backward Compatibility

Schema changes should follow expand/contract:

1. additive first
2. dual-read/write if needed
3. cleanup only after all readers updated
