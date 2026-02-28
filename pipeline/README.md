# Rekindle Pipeline (Vendored)

This folder contains the standalone ingestion scaffold copied into `rekindle_web`.

Current CLI commands:

- `list-sources`
- `run-source <source_key>`

Source fixture tests:

- `npm run pipeline:test:rak`
- `npm run pipeline:test:quality`

Deliberately excluded from CLI:

- automatic sync-to-drafts
- automatic export/publish

The Studio app owns human review and promotion via `/studio/ingestion`.
