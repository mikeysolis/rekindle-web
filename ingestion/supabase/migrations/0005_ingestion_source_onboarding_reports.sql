-- Rekindle Content Pipeline
-- ING-030: Source probe onboarding reports
--
-- Rollback notes:
--   1) This migration is additive and safe to deploy without downtime.
--   2) To rollback, drop trigger/function then drop table:
--      trg_set_ingest_source_onboarding_reports_updated_at,
--      set_ingest_source_onboarding_reports_updated_at(),
--      ingest_source_onboarding_reports.

create table if not exists public.ingest_source_onboarding_reports (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  input_url text not null,
  root_url text not null,
  source_domain text not null,
  probe_status text not null default 'completed'
    check (probe_status in ('completed', 'failed')),
  fetch_status text not null default 'ok'
    check (fetch_status in ('ok', 'partial', 'failed')),
  recommended_strategy_order text[] not null default '{}'::text[],
  recommendation_confidence numeric(5,4) not null default 0
    check (recommendation_confidence >= 0 and recommendation_confidence <= 1),
  operator_approval_action text not null default 'pending_review'
    check (operator_approval_action in ('pending_review', 'approved_for_trial', 'rejected')),
  operator_decision_reason text null,
  actor_user_id uuid null,
  decided_at timestamptz null,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(source_key) > 0),
  check (char_length(input_url) > 0),
  check (char_length(root_url) > 0),
  check (char_length(source_domain) > 0),
  check (
    recommended_strategy_order <@ array['api', 'feed', 'sitemap_html', 'pdf', 'ics', 'headless']::text[]
  )
);

create index if not exists idx_ingest_source_onboarding_reports__source_created
on public.ingest_source_onboarding_reports(source_key, created_at desc);

create index if not exists idx_ingest_source_onboarding_reports__approval_created
on public.ingest_source_onboarding_reports(operator_approval_action, created_at desc);

create index if not exists idx_ingest_source_onboarding_reports__created_desc
on public.ingest_source_onboarding_reports(created_at desc);

create or replace function public.set_ingest_source_onboarding_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_ingest_source_onboarding_reports_updated_at
on public.ingest_source_onboarding_reports;
create trigger trg_set_ingest_source_onboarding_reports_updated_at
before update on public.ingest_source_onboarding_reports
for each row execute function public.set_ingest_source_onboarding_reports_updated_at();
