# Durable Ingestion Store

This folder contains schema setup for the separate, durable ingestion Supabase project.

## Migration

- `supabase/migrations/0001_ingestion_core.sql`
- `supabase/migrations/0002_ingestion_learning_analytics.sql`
- `supabase/migrations/0003_ingestion_source_registry.sql`

Apply this SQL to your dedicated ingestion project before running pipeline jobs.

## Operations

Preferred cleanup path:

- `npm run ingest:cleanup:sql`
- Run SQL from `supabase/sql/cleanup_ingestion_tables.sql` in the ingestion project.

Guarded reset wrappers:

- local reset: `INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- --allow-local-reset --environment local --confirm reset-local`
- linked reset: `INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- --allow-linked-reset --environment staging --confirm reset-staging`

## Why separate from app DB?

- Survives app DB resets during alpha.
- Keeps scrape lifecycle and dedupe history independent from product schema churn.
