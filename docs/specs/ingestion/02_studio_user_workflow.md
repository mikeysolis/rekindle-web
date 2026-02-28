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
   - capture reason/note
   - write sync/audit log

2. Needs Work:
   - set status `curated`
   - capture note for later revision
   - keep candidate discoverable in inbox

3. Promote to Draft:
   - idempotent create/find draft
   - map candidate fields to draft fields
   - optionally map trait hints
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
