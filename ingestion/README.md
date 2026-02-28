# Durable Ingestion Store

This folder contains schema setup for the separate, durable ingestion Supabase project.

## Migration

- `supabase/migrations/0001_ingestion_core.sql`

Apply this SQL to your dedicated ingestion project before running pipeline jobs.

## Why separate from app DB?

- Survives app DB resets during alpha.
- Keeps scrape lifecycle and dedupe history independent from product schema churn.
