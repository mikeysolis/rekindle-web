# Rekindle Pipeline (Vendored)

This folder contains the standalone ingestion scaffold copied into `rekindle_web`.

Current CLI commands:

- `list-sources`
- `run-source <source_key>`
- `run-source <source_key> --respect-cadence`
- `run-source <source_key> --force`
- `source-health [source_key]`
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
  - include/exclude URL patterns
  - retry budget via `metadata_json.runtime.*`

Promotion reconciliation:

- `npm run pipeline:reconcile-promotions`
- intended cadence: hourly

Deliberately excluded from CLI:

- automatic sync-to-drafts
- automatic export/publish

The Studio app owns human review and promotion via `/studio/ingestion`.
