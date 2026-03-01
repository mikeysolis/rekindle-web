# Rekindle Web (Studio + Ingestion Inbox)

This repo contains:

- The Next.js Studio web app (`/studio/*`)
- A vendored ingestion pipeline scaffold (`/pipeline`)
- Ingestion Supabase local config and migrations (`/ingestion`)

## Getting Started

For a full end-to-end operator guide, start here:

- `docs/specs/ingestion/17_system_usage_guide.md`

For the full ingestion spec pack/document map:

- `docs/specs/ingestion/README.md`

## Environment

Set app auth env vars (existing Studio):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Set ingestion env vars (server-only, do not prefix with `NEXT_PUBLIC_`):

- `INGEST_SUPABASE_URL`
- `INGEST_SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SNAPSHOT_MODE` (`local` or `supabase`)
- `INGEST_SNAPSHOT_LOCAL_DIR`
- `INGEST_SNAPSHOT_BUCKET`
- `INGEST_LOG_LEVEL`
- `INGEST_DEFAULT_LOCALE`

Canonical contract:

- `docs/specs/ingestion/14_environment_and_secrets_contract.md`

Forbidden env vars:

- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SUPABASE_KEY`

See `pipeline/env.example` for ingestion env examples.

## Studio

Run Studio:

```bash
npm run dev
```

Primary editorial routes:

- `/studio/ingestion` - ingestion inbox (review/reject/needs work/promote)
- `/studio/drafts` - draft editing and publish gate
- `/studio/export` - CSV export for publishable drafts

## Ingestion Pipeline (scaffold)

Build pipeline code:

```bash
npm run pipeline:build
```

List available sources:

```bash
npm run pipeline:list-sources
```

Run one source:

```bash
npm run pipeline:run-source -- rak
```

## Local Supabase Workdirs

App DB:

```bash
npm run supabase:start
```

Ingestion DB:

```bash
npm run ingest:supabase:start
```

Preferred ingestion cleanup SQL:

```bash
npm run ingest:cleanup:sql
```

Guarded reset commands (require explicit flags + environment confirmation):

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- --allow-local-reset --environment local --confirm reset-local --dry-run
INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- --allow-linked-reset --environment staging --confirm reset-staging --dry-run
```

## Workflow Guardrail

Scraper output is reviewed in Studio before drafting:

- No automatic draft creation from ingestion jobs
- No automatic publishing from ingestion output
- Promotion to draft is manual via Studio action
