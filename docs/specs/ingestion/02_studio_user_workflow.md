# Studio User Workflow for Ingestion (v1)

## 1) User Roles

1. Viewer:
   - read-only access to candidates and run evidence.
2. Editor:
   - reject, mark needs work, promote to draft, edit post-promotion.
3. Admin:
   - editor permissions plus source policy and governance controls.

## 2) Primary User Journey

1. Open `Studio > Ingestion`.
2. Filter/sort candidates by status, source, confidence, duplicate risk, date.
3. Open candidate detail.
4. Review evidence:
   - extracted fields
   - source URL
   - raw excerpt
   - quality flags
   - similar candidates
5. Choose action:
   - reject
   - needs work
   - promote to draft
6. If promoted, continue standard draft workflow (`draft -> review -> publishable -> exported`).

## 3) Candidate Status Semantics

Machine-side statuses:

- `new`: unprocessed raw candidate
- `normalized`: cleaned and structured
- `curated`: passed basic machine checks or marked needs work by editor
- `pushed_to_studio`: promoted to app draft by human action
- `exported`: lineage marker after downstream publish/export completion
- `rejected`: excluded from promotion path

## 4) Editor Actions and Effects

1. Reject:
   - set status `rejected`
   - require standardized `reject_reason_code`
   - require duplicate confirmation (`true|false`)
   - optional freeform note
   - write label row to `ingest_editor_labels`

2. Needs Work:
   - set status `curated`
   - require rewrite severity (`light|moderate|heavy`)
   - require duplicate confirmation (`true|false`)
   - optional note for later revision
   - write label row to `ingest_editor_labels`
   - keep candidate discoverable in inbox

3. Promote to Draft:
   - idempotent create/find draft
   - map candidate fields to draft fields
   - optionally map trait hints
   - require promotion type (`promoted` vs `promoted_after_edit`)
   - require rewrite severity (`light|moderate|heavy`)
   - require duplicate confirmation (`true|false`)
   - write label row to `ingest_editor_labels`
   - set candidate status `pushed_to_studio`
   - write sync log with mapping

## 5) Required UX Features

1. Fast triage view:
   - status/source filters
   - search
   - bulk reject for obvious noise

2. Evidence-first detail page:
   - source attribution
   - quality/risk explanation
   - sync history

3. Duplicate awareness:
   - show likely duplicates before promotion
   - allow open-existing-draft path

4. Audit visibility:
   - action history and actor metadata

## 6) Feedback Signals Captured from Workflow

Every action should produce structured labels:

1. promoted
2. rejected
3. edited-then-promoted
4. rejection reason code
5. degree of manual rewrite needed

These labels are mandatory inputs for tuning extraction quality.

## 6.1) Rejection Reason Taxonomy (v1 UI)

1. `not_actionable`
2. `too_vague_or_generic`
3. `duplicate_existing_idea`
4. `safety_or_harm_risk`
5. `policy_or_compliance_risk`
6. `off_topic_for_rekindle`
7. `low_content_quality`
8. `extraction_error_or_incomplete`
9. `paywalled_or_missing_context`

## 7) Source Lifecycle Governance (Admin)

1. Open `Studio > Ingestion > Source Lifecycle Review`.
2. Reactivation flow (`paused|degraded -> active`):
   - choose source
   - enter review reason
   - confirm product owner approval and compliance acknowledgment
3. Retirement flow (`active|degraded|paused -> retired`):
   - choose source
   - enter retirement reason
   - optionally provide archival reference and archival summary
   - confirm product owner approval and compliance acknowledgment
4. `retired` is terminal and should not offer reactivation controls in Studio.

## 8) Tuning Experiment Logging (Admin)

1. Open `Studio > Ingestion > Experiment & Tuning History`.
2. Record each tuning rollout with:
   - experiment name and hypothesis
   - status and decision (`adopt|revert|iterate`)
   - deployment mode (`shadow|canary|full`)
   - result summary
   - source and config version
   - change JSON payload
   - control/treatment sample evidence (reviewed candidates and window days)
   - baseline/treatment metrics including guardrails:
     - `duplicate_confirmed_rate`
     - `safety_flag_rate`
     - `compliance_incident_rate`
3. Save to create linked records in:
   - `ingest_experiments`
   - `ingest_experiment_metrics`
   - `ingest_tuning_changes`
4. Full `adopt` rollouts are blocked unless both control and treatment meet:
   - at least 200 reviewed candidates
   - at least 14 days of data
   - no guardrail regressions
5. Use the history table to verify every rollout has hypothesis, result, mode, gate verdict, and decision traceability.

## 9) Tuning Rollback (Admin)

1. Open `Studio > Ingestion > Experiment & Tuning History > Rollback Tuning Config`.
2. Select source, add rollback reason, and provide rollback patch JSON.
3. Submit rollback to execute `update_source_config` with an auto-incremented config version.
4. Confirm success banner with new config version and check source audit history.
