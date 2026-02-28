-- Rekindle Content Pipeline
-- ING-003: Learning + experiment analytics tables
--
-- Rollback notes:
--   1) This migration is additive only and safe to deploy without downtime.
--   2) To rollback, drop child tables before parent tables in this order:
--      ingest_tuning_changes -> ingest_experiment_metrics ->
--      ingest_editor_labels -> ingest_experiments.
--   3) Rolling back removes analytics history; export rows before rollback if needed.
--
-- Recovery notes:
--   1) If deployment partially fails, rerun migration after fixing blocking issue.
--   2) If data drift occurs, restore from latest backup and replay ingestion label events.

create table if not exists public.ingest_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hypothesis text not null,
  scope_json jsonb not null default '{}'::jsonb,
  status text not null default 'planned'
    check (status in ('planned', 'running', 'completed', 'aborted')),
  started_at timestamptz null,
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) > 0),
  check (char_length(hypothesis) > 0)
);

create index if not exists idx_ingest_experiments__status_started
on public.ingest_experiments(status, started_at desc);

create index if not exists idx_ingest_experiments__created_desc
on public.ingest_experiments(created_at desc);

create table if not exists public.ingest_editor_labels (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.ingest_candidates(id) on delete cascade,
  action text not null
    check (action in ('promoted', 'promoted_after_edit', 'rejected', 'needs_work')),
  reject_reason_code text null,
  rewrite_severity text null
    check (rewrite_severity in ('light', 'moderate', 'heavy')),
  duplicate_confirmed boolean null,
  actor_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingest_editor_labels__candidate_created
on public.ingest_editor_labels(candidate_id, created_at desc);

create index if not exists idx_ingest_editor_labels__action_created
on public.ingest_editor_labels(action, created_at desc);

create index if not exists idx_ingest_editor_labels__reject_reason
on public.ingest_editor_labels(reject_reason_code);

create index if not exists idx_ingest_editor_labels__actor_created
on public.ingest_editor_labels(actor_user_id, created_at desc);

create table if not exists public.ingest_experiment_metrics (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.ingest_experiments(id) on delete cascade,
  metric_name text not null,
  baseline_value double precision not null,
  treatment_value double precision not null,
  delta_value double precision not null,
  created_at timestamptz not null default now(),
  unique (experiment_id, metric_name),
  check (char_length(metric_name) > 0)
);

create index if not exists idx_ingest_experiment_metrics__experiment
on public.ingest_experiment_metrics(experiment_id);

create table if not exists public.ingest_tuning_changes (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.ingest_experiments(id) on delete restrict,
  source_key text not null,
  config_version text not null,
  change_json jsonb not null default '{}'::jsonb,
  approved_by uuid not null,
  applied_at timestamptz not null default now(),
  unique (experiment_id, source_key, config_version),
  check (char_length(source_key) > 0),
  check (char_length(config_version) > 0)
);

create index if not exists idx_ingest_tuning_changes__source_applied
on public.ingest_tuning_changes(source_key, applied_at desc);

create index if not exists idx_ingest_tuning_changes__experiment
on public.ingest_tuning_changes(experiment_id);

create or replace function public.set_ingest_experiments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_ingest_experiments_updated_at on public.ingest_experiments;
create trigger trg_set_ingest_experiments_updated_at
before update on public.ingest_experiments
for each row execute function public.set_ingest_experiments_updated_at();
