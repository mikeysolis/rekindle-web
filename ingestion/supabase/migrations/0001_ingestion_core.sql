-- Rekindle Content Pipeline
-- Durable ingestion schema (separate Supabase project)

create extension if not exists pgcrypto;

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed')),
  meta_json jsonb not null default '{}'::jsonb
);

create index if not exists idx_ingest_runs__source_started
on public.ingest_runs(source_key, started_at desc);

create table if not exists public.ingest_pages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ingest_runs(id) on delete cascade,
  source_key text not null,
  url text not null,
  discovered_at timestamptz not null default now(),
  fetched_at timestamptz null,
  http_status integer null,
  content_hash text null,
  status text not null default 'discovered'
    check (status in ('discovered', 'fetched', 'extracted', 'skipped', 'failed')),
  error_text text null
);

create index if not exists idx_ingest_pages__run_id
on public.ingest_pages(run_id);

create index if not exists idx_ingest_pages__source_url
on public.ingest_pages(source_key, url);

create index if not exists idx_ingest_pages__status
on public.ingest_pages(status);

create table if not exists public.ingest_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ingest_runs(id) on delete cascade,
  page_id uuid null references public.ingest_pages(id) on delete set null,
  source_key text not null,
  source_url text not null,
  title text not null,
  description text null,
  reason_snippet text null,
  raw_excerpt text null,
  candidate_key text not null,
  status text not null default 'new'
    check (status in ('new', 'normalized', 'curated', 'pushed_to_studio', 'exported', 'rejected')),
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_key)
);

create index if not exists idx_ingest_candidates__run_id
on public.ingest_candidates(run_id);

create index if not exists idx_ingest_candidates__source_status
on public.ingest_candidates(source_key, status);

create index if not exists idx_ingest_candidates__updated_at_desc
on public.ingest_candidates(updated_at desc);

create table if not exists public.ingest_candidate_traits (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.ingest_candidates(id) on delete cascade,
  trait_type_slug text not null,
  trait_option_slug text not null,
  confidence numeric(5,4) null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (candidate_id, trait_type_slug, trait_option_slug)
);

create index if not exists idx_ingest_candidate_traits__candidate
on public.ingest_candidate_traits(candidate_id);

create table if not exists public.ingest_sync_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.ingest_candidates(id) on delete cascade,
  target_system text not null,
  target_id text null,
  status text not null
    check (status in ('pending', 'success', 'failed')),
  synced_at timestamptz not null default now(),
  error_text text null
);

create index if not exists idx_ingest_sync_log__candidate_synced
on public.ingest_sync_log(candidate_id, synced_at desc);

create index if not exists idx_ingest_sync_log__target_status
on public.ingest_sync_log(target_system, status);

create or replace function public.set_ingest_candidates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_ingest_candidates_updated_at on public.ingest_candidates;
create trigger trg_set_ingest_candidates_updated_at
before update on public.ingest_candidates
for each row execute function public.set_ingest_candidates_updated_at();
