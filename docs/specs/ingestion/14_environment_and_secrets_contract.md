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

Required:

1. `INGEST_SUPABASE_URL`
2. `INGEST_SUPABASE_SERVICE_ROLE_KEY`

Optional:

1. `INGEST_SNAPSHOT_MODE` (`local|supabase`)
2. `INGEST_SNAPSHOT_LOCAL_DIR`
3. `INGEST_SNAPSHOT_BUCKET`
4. `INGEST_LOG_LEVEL`
5. `INGEST_DEFAULT_LOCALE`

## 3) Canonical Namespace Rules

1. App DB public client keys use `NEXT_PUBLIC_SUPABASE_*`.
2. Ingestion DB server credentials use `INGEST_*`.
3. Service role credentials must never use `NEXT_PUBLIC_*`.
4. App DB and ingestion DB must be different projects/environments.

## 4) Forbidden Variables

1. `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
2. `INGEST_SUPABASE_KEY`

Rationale:

1. `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` exposes privileged credentials to the browser.
2. `INGEST_SUPABASE_KEY` is a legacy/non-canonical name and causes ambiguity with `INGEST_SUPABASE_SERVICE_ROLE_KEY`.

## 5) Validation Behavior

Validation must fail startup when:

1. required variables for that runtime profile are missing.
2. a forbidden variable is present.
3. `INGEST_SUPABASE_URL` equals `NEXT_PUBLIC_SUPABASE_URL`.

Error messages must:

1. identify missing/forbidden keys explicitly.
2. explain the fix.
3. reference this contract document.

## 6) Enforcement Points

1. Studio startup: `scripts/validate-env.mjs --runtime studio`.
2. Pipeline run startup: `scripts/validate-env.mjs --runtime pipeline`.
3. Runtime guards:
   - `lib/database/env.ts`
   - `lib/ingestion/env.ts`
   - `pipeline/src/config/env.ts`

## 7) Migration Notes

1. Remove any `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` entries from all environments.
2. Remove any `INGEST_SUPABASE_KEY` entries and keep only `INGEST_SUPABASE_SERVICE_ROLE_KEY`.
3. Confirm app and ingestion URLs target separate projects before enabling schedules.
