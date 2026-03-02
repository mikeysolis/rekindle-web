# Environment and Secrets Contract (v1)
_Last updated: 2026-02-28_

## 1) Purpose

Define canonical environment variable names and validation rules so Studio and ingestion runtime do not collide or leak secrets.

## 2) Runtime Profiles

### Studio runtime (Next.js server + client)

Required:

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `INGEST_SUPABASE_URL`
4. `INGEST_SUPABASE_SERVICE_ROLE_KEY`

### Ingestion runtime (pipeline worker/CLI)

Required for source-run commands:

1. `INGEST_SUPABASE_URL`
2. `INGEST_SUPABASE_SERVICE_ROLE_KEY`

Required for cross-DB reconciliation command (`reconcile-promotions`):

1. `APP_SUPABASE_URL`
2. `APP_SUPABASE_SERVICE_ROLE_KEY`

Optional:

1. `INGEST_SNAPSHOT_MODE` (`local|supabase`)
2. `INGEST_SNAPSHOT_LOCAL_DIR`
3. `INGEST_SNAPSHOT_BUCKET`
4. `INGEST_LOG_LEVEL`
5. `INGEST_DEFAULT_LOCALE`
6. `INGEST_ENVIRONMENT` (`local|staging|...`) required for guarded reset operations
7. `INGEST_RECONCILIATION_SPIKE_THRESHOLD` (default `25`)
8. `INGEST_RECONCILIATION_PAGE_SIZE` (default `500`)
9. `INGEST_COMPLIANCE_ROBOTS_TTL_DAYS` (default `7`)
10. `INGEST_COMPLIANCE_TERMS_TTL_DAYS` (default `30`)

## 3) Canonical Namespace Rules

1. App DB public client keys use `NEXT_PUBLIC_SUPABASE_*`.
2. Ingestion DB server credentials use `INGEST_*`.
3. App DB server credentials for pipeline reconciliation use `APP_*`.
4. Service role credentials must never use `NEXT_PUBLIC_*`.
5. App DB and ingestion DB must be different projects/environments.

## 4) Forbidden Variables

1. `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
2. `INGEST_SUPABASE_KEY`
3. `APP_SUPABASE_KEY`

Rationale:

1. `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` exposes privileged credentials to the browser.
2. `INGEST_SUPABASE_KEY` is a legacy/non-canonical name and causes ambiguity with `INGEST_SUPABASE_SERVICE_ROLE_KEY`.
3. `APP_SUPABASE_KEY` is a legacy/non-canonical name and causes ambiguity with `APP_SUPABASE_SERVICE_ROLE_KEY`.

## 5) Validation Behavior

Validation must fail startup when:

1. required variables for that runtime profile are missing.
2. a forbidden variable is present.
3. `INGEST_SUPABASE_URL` equals `NEXT_PUBLIC_SUPABASE_URL`.
4. for reconciliation runtime, `APP_SUPABASE_URL` equals `INGEST_SUPABASE_URL`.

Error messages must:

1. identify missing/forbidden keys explicitly.
2. explain the fix.
3. reference this contract document.

## 6) Enforcement Points

1. Studio startup: `scripts/validate-env.mjs --runtime studio`.
2. Pipeline run startup: `scripts/validate-env.mjs --runtime pipeline`.
3. Pipeline reconciliation startup: `scripts/validate-env.mjs --runtime pipeline-reconcile`.
4. Runtime guards:
   - `lib/database/env.ts`
   - `lib/ingestion/env.ts`
   - `pipeline/src/config/env.ts`

## 7) Migration Notes

1. Remove any `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` entries from all environments.
2. Remove any `INGEST_SUPABASE_KEY` entries and keep only `INGEST_SUPABASE_SERVICE_ROLE_KEY`.
3. Remove any `APP_SUPABASE_KEY` entries and keep only `APP_SUPABASE_SERVICE_ROLE_KEY`.
4. Confirm app and ingestion URLs target separate projects before enabling schedules.
