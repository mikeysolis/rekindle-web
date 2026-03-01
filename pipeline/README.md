# Rekindle Pipeline (Vendored)

This folder contains the standalone ingestion scaffold copied into `rekindle_web`.

Current CLI commands:

- `list-sources`
- `run-source <source_key>`
- `run-source <source_key> --respect-cadence`
- `run-source <source_key> --force`
- `source-health [source_key]`
- `incident-alerts [source_key]`
- `source-probe <url_or_domain>`
- `source-probe <url_or_domain> --approval-action approved_for_trial`
- `source-probe <url_or_domain> --no-create-proposal`
- `reconcile-promotions`

Current source keys:

- `rak`
- `ggia`
- `dosomething`
- `action_for_happiness`
- `red_cross_pdf`

Source fixture tests:

- `npm run pipeline:test:rak`
- `npm run pipeline:test:sources`
- `npm run pipeline:test:quality`
- `npm run pipeline:test:runtime`
- `npm run pipeline:test:source-probe`
- `npm run pipeline:test:reconcile`

Source module contract:

- required module methods: `discover`, `extract`, `healthCheck`
- enforced output validation for discovered pages and extracted candidate metadata
- reusable mock-fetch fixture runner: `pipeline/src/sources/fixture-runner.ts`
- per-source runtime policy from `ingest_source_registry`:
  - cadence (optional)
  - `max_rps`
  - `max_concurrency`
  - `timeout_seconds`
  - `strategy_order` (scored + fallback ladder within approved strategies)
  - include/exclude URL patterns
  - retry budget via `metadata_json.runtime.*`
  - lifecycle automation hooks:
    - auto-degrade on sustained failure/quality drop
    - degraded cadence downgrade to low-frequency probe mode
    - lifecycle alert evidence persisted in `metadata_json.lifecycle.*`
  - compliance pre-run checks (ING-050):
    - source must be `active` and `approved_for_prod=true`
    - `robots_checked_at` and `terms_checked_at` must be within policy TTL
    - legal hold sources are blocked
    - compliance failures block execution before extraction and emit lifecycle/compliance evidence
    - `--force` does not bypass compliance gates

Promotion reconciliation:

- `npm run pipeline:reconcile-promotions`
- intended cadence: hourly

Deliberately excluded from CLI:

- automatic sync-to-drafts
- automatic export/publish

The Studio app owns human review and promotion via `/studio/ingestion`.
