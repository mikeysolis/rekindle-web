# Rekindle Web (Studio + Ingestion Inbox)

This repo contains:

- The Next.js Studio web app (`/studio/*`)
- A vendored ingestion pipeline scaffold (`/pipeline`)
- Ingestion Supabase local config and migrations (`/ingestion`)

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

See `pipeline/env.example` for the ingestion sample.

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

## Workflow Guardrail

Scraper output is reviewed in Studio before drafting:

- No automatic draft creation from ingestion jobs
- No automatic publishing from ingestion output
- Promotion to draft is manual via Studio action
