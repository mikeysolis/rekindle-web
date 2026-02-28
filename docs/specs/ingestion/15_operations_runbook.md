# Ingestion Operations Runbook (v1)
_Last updated: 2026-02-28_

## 1) Purpose

Define safe operational procedures for ingestion database cleanup and reset.

## 2) Safety Rules

1. Default to ingestion-only cleanup, not full DB reset.
2. Never run linked remote reset against production-like environments.
3. For any full reset command, require:
   - explicit override flag
   - explicit environment confirmation token
   - `INGEST_ENVIRONMENT` match with `--environment`
4. Run `--dry-run` first before executing reset commands.

## 3) Preferred Routine Cleanup

Command:

```bash
npm run ingest:cleanup:sql
```

Then execute SQL from:

- `ingestion/supabase/sql/cleanup_ingestion_tables.sql`

This cleanup removes ingestion run/candidate data while preserving source registry configuration.

## 4) Full Local Reset (Only When Needed)

Dry-run:

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- --allow-local-reset --environment local --confirm reset-local --dry-run
```

Execute:

```bash
INGEST_ENVIRONMENT=local npm run ingest:supabase:reset -- --allow-local-reset --environment local --confirm reset-local
```

## 5) Full Linked Reset (Staging/Test Only)

Dry-run:

```bash
INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- --allow-linked-reset --environment staging --confirm reset-staging --dry-run
```

Execute:

```bash
INGEST_ENVIRONMENT=staging npm run ingest:supabase:reset:linked -- --allow-linked-reset --environment staging --confirm reset-staging
```

Notes:

1. `ingest:supabase:reset:linked` is blocked for `prod`, `production`, and `live` environments.
2. If `INGEST_ENVIRONMENT` and `--environment` do not match, reset is blocked.

## 6) Verification Checklist (Before Reset)

1. Confirm target ingestion project and environment.
2. Confirm no production target.
3. Confirm backup/export requirements.
4. Run dry-run and review generated command.
5. Execute reset only after explicit human approval.
