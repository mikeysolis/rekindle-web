-- Rekindle Content Pipeline
-- ING-004: Source registry + lifecycle guardrails + immutable audit events
--
-- Rollback notes:
--   1) This migration is additive only and safe to deploy without downtime.
--   2) To rollback, drop in this order:
--      triggers/functions on ingest_source_registry_audit_events,
--      ingest_source_registry_audit_events,
--      triggers/functions on ingest_source_registry,
--      ingest_source_registry.
--   3) Rolling back removes source-governance audit history; export before rollback if required.
--
-- Recovery notes:
--   1) If deployment partially fails, fix the failing statement and rerun migration.
--   2) If source states drift, use set_source_state/update_source_config functions to repair while preserving audit trail.

create table if not exists public.ingest_source_registry (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  domains text[] not null default '{}'::text[],
  content_type text not null default 'ideas',
  state text not null default 'proposed'
    check (state in ('proposed', 'approved_for_trial', 'active', 'degraded', 'paused', 'retired')),
  owner_team text not null default 'ingestion',
  owner_user_id uuid null,
  reviewed_at timestamptz null,
  next_review_at timestamptz null,
  discovery_methods text[] not null default array['manual_seed']::text[],
  seed_urls text[] not null default '{}'::text[],
  include_url_patterns text[] not null default '{}'::text[],
  exclude_url_patterns text[] not null default '{}'::text[],
  strategy_order text[] not null default array['sitemap_html']::text[],
  selector_profile_version text null,
  quality_threshold numeric(5,4) not null default 0.5000
    check (quality_threshold >= 0 and quality_threshold <= 1),
  cadence text null,
  max_rps numeric(6,3) not null default 1.000 check (max_rps > 0),
  max_concurrency integer not null default 1 check (max_concurrency > 0),
  timeout_seconds integer not null default 30 check (timeout_seconds > 0),
  legal_risk_level text not null default 'medium'
    check (legal_risk_level in ('low', 'medium', 'high')),
  robots_checked_at timestamptz null,
  terms_checked_at timestamptz null,
  approved_for_prod boolean not null default false,
  last_run_at timestamptz null,
  last_success_at timestamptz null,
  rolling_promotion_rate_30d numeric(6,5) null
    check (rolling_promotion_rate_30d >= 0 and rolling_promotion_rate_30d <= 1),
  rolling_failure_rate_30d numeric(6,5) null
    check (rolling_failure_rate_30d >= 0 and rolling_failure_rate_30d <= 1),
  config_version text not null default '1',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(source_key) > 0),
  check (char_length(display_name) > 0),
  check (char_length(owner_team) > 0),
  check (char_length(config_version) > 0),
  check (
    discovery_methods <@ array['manual_seed', 'sitemap', 'feed', 'index_page', 'search_discovery']::text[]
  ),
  check (
    strategy_order <@ array['api', 'feed', 'sitemap_html', 'pdf', 'ics', 'headless']::text[]
  )
);

create index if not exists idx_ingest_source_registry__state
on public.ingest_source_registry(state);

create index if not exists idx_ingest_source_registry__active
on public.ingest_source_registry(state, approved_for_prod);

create index if not exists idx_ingest_source_registry__updated_desc
on public.ingest_source_registry(updated_at desc);

create table if not exists public.ingest_source_registry_audit_events (
  id uuid primary key default gen_random_uuid(),
  source_registry_id uuid not null references public.ingest_source_registry(id) on delete restrict,
  source_key text not null,
  event_type text not null
    check (event_type in ('source_created', 'state_transition', 'config_updated')),
  actor_user_id uuid null,
  actor_label text not null default 'system',
  reason text null,
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingest_source_registry_audit__source_created
on public.ingest_source_registry_audit_events(source_key, created_at desc);

create index if not exists idx_ingest_source_registry_audit__source_id_created
on public.ingest_source_registry_audit_events(source_registry_id, created_at desc);

create index if not exists idx_ingest_source_registry_audit__event_type
on public.ingest_source_registry_audit_events(event_type, created_at desc);

create or replace function public.ingest_source_registry_actor_user_id()
returns uuid
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := nullif(current_setting('app.current_actor_id', true), '');
  if raw_value is null then
    raw_value := nullif(current_setting('request.jwt.claim.sub', true), '');
  end if;

  if raw_value is null then
    return null;
  end if;

  begin
    return raw_value::uuid;
  exception
    when others then
      return null;
  end;
end;
$$;

create or replace function public.ingest_source_registry_actor_label()
returns text
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := nullif(current_setting('app.current_actor_label', true), '');
  if raw_value is not null then
    return raw_value;
  end if;

  raw_value := nullif(current_setting('request.jwt.claim.email', true), '');
  if raw_value is not null then
    return raw_value;
  end if;

  raw_value := nullif(current_setting('request.jwt.claim.sub', true), '');
  if raw_value is not null then
    return raw_value;
  end if;

  return current_user;
end;
$$;

create or replace function public.ingest_source_registry_change_reason()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.current_change_reason', true), '');
$$;

create or replace function public.ingest_set_source_registry_audit_context(
  p_actor_user_id uuid,
  p_reason text
)
returns void
language plpgsql
as $$
begin
  perform set_config('app.current_actor_id', coalesce(p_actor_user_id::text, ''), true);
  perform set_config(
    'app.current_actor_label',
    coalesce(p_actor_user_id::text, 'system'),
    true
  );
  perform set_config('app.current_change_reason', coalesce(p_reason, ''), true);
end;
$$;

create or replace function public.ingest_is_valid_source_state_transition(
  p_from_state text,
  p_to_state text
)
returns boolean
language sql
immutable
as $$
  select case p_from_state
    when 'proposed' then p_to_state in ('proposed', 'approved_for_trial')
    when 'approved_for_trial' then p_to_state in ('approved_for_trial', 'active', 'paused')
    when 'active' then p_to_state in ('active', 'degraded', 'paused', 'retired')
    when 'degraded' then p_to_state in ('degraded', 'active', 'paused', 'retired')
    when 'paused' then p_to_state in ('paused', 'active', 'retired')
    when 'retired' then p_to_state = 'retired'
    else false
  end;
$$;

create or replace function public.ingest_source_registry_guardrails()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if not public.ingest_is_valid_source_state_transition(old.state, new.state) then
    raise exception
      'Invalid ingest source state transition: % -> % for source_key=%',
      old.state,
      new.state,
      old.source_key;
  end if;

  if new.state = 'active' and new.approved_for_prod is not true then
    raise exception
      'Cannot set source_key=% to active while approved_for_prod=false',
      new.source_key;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ingest_source_registry_guardrails on public.ingest_source_registry;
create trigger trg_ingest_source_registry_guardrails
before update on public.ingest_source_registry
for each row execute function public.ingest_source_registry_guardrails();

create or replace function public.log_ingest_source_registry_audit_event()
returns trigger
language plpgsql
as $$
declare
  event_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.ingest_source_registry_audit_events (
      source_registry_id,
      source_key,
      event_type,
      actor_user_id,
      actor_label,
      reason,
      old_values,
      new_values
    )
    values (
      new.id,
      new.source_key,
      'source_created',
      public.ingest_source_registry_actor_user_id(),
      public.ingest_source_registry_actor_label(),
      public.ingest_source_registry_change_reason(),
      '{}'::jsonb,
      to_jsonb(new)
    );
    return null;
  end if;

  if (to_jsonb(old) - 'updated_at') = (to_jsonb(new) - 'updated_at') then
    return null;
  end if;

  if new.state is distinct from old.state then
    event_name := 'state_transition';
  else
    event_name := 'config_updated';
  end if;

  insert into public.ingest_source_registry_audit_events (
    source_registry_id,
    source_key,
    event_type,
    actor_user_id,
    actor_label,
    reason,
    old_values,
    new_values
  )
  values (
    new.id,
    new.source_key,
    event_name,
    public.ingest_source_registry_actor_user_id(),
    public.ingest_source_registry_actor_label(),
    public.ingest_source_registry_change_reason(),
    to_jsonb(old),
    to_jsonb(new)
  );

  return null;
end;
$$;

drop trigger if exists trg_log_ingest_source_registry_audit_event on public.ingest_source_registry;
create trigger trg_log_ingest_source_registry_audit_event
after insert or update on public.ingest_source_registry
for each row execute function public.log_ingest_source_registry_audit_event();

create or replace function public.prevent_ingest_source_registry_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ingest_source_registry_audit_events is immutable';
end;
$$;

drop trigger if exists trg_prevent_ingest_source_registry_audit_mutation
on public.ingest_source_registry_audit_events;
create trigger trg_prevent_ingest_source_registry_audit_mutation
before update or delete on public.ingest_source_registry_audit_events
for each row execute function public.prevent_ingest_source_registry_audit_mutation();

create or replace function public.ingest_jsonb_text_array(p_value jsonb)
returns text[]
language sql
immutable
as $$
  select case
    when p_value is null then null
    when jsonb_typeof(p_value) <> 'array' then null
    else coalesce(array(select jsonb_array_elements_text(p_value)), '{}'::text[])
  end;
$$;

create or replace function public.create_source_proposal(
  p_source_key text,
  p_display_name text,
  p_domains text[] default '{}'::text[],
  p_content_type text default 'ideas',
  p_discovery_methods text[] default array['manual_seed']::text[],
  p_seed_urls text[] default '{}'::text[],
  p_strategy_order text[] default array['sitemap_html']::text[],
  p_owner_team text default 'ingestion',
  p_owner_user_id uuid default null,
  p_actor_user_id uuid default null,
  p_reason text default null
)
returns public.ingest_source_registry
language plpgsql
as $$
declare
  inserted_row public.ingest_source_registry;
begin
  perform public.ingest_set_source_registry_audit_context(p_actor_user_id, p_reason);

  insert into public.ingest_source_registry (
    source_key,
    display_name,
    domains,
    content_type,
    state,
    discovery_methods,
    seed_urls,
    strategy_order,
    owner_team,
    owner_user_id
  )
  values (
    p_source_key,
    p_display_name,
    coalesce(p_domains, '{}'::text[]),
    p_content_type,
    'proposed',
    coalesce(p_discovery_methods, array['manual_seed']::text[]),
    coalesce(p_seed_urls, '{}'::text[]),
    coalesce(p_strategy_order, array['sitemap_html']::text[]),
    coalesce(p_owner_team, 'ingestion'),
    p_owner_user_id
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

create or replace function public.approve_source_for_trial(
  p_source_key text,
  p_approver_user_id uuid,
  p_reason text default null
)
returns public.ingest_source_registry
language plpgsql
as $$
declare
  updated_row public.ingest_source_registry;
begin
  perform public.ingest_set_source_registry_audit_context(p_approver_user_id, p_reason);

  update public.ingest_source_registry
  set
    state = 'approved_for_trial',
    reviewed_at = now()
  where source_key = p_source_key
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Source not found for source_key=%', p_source_key;
  end if;

  return updated_row;
end;
$$;

create or replace function public.activate_source(
  p_source_key text,
  p_approver_user_id uuid,
  p_reason text default null
)
returns public.ingest_source_registry
language plpgsql
as $$
declare
  updated_row public.ingest_source_registry;
begin
  perform public.ingest_set_source_registry_audit_context(p_approver_user_id, p_reason);

  update public.ingest_source_registry
  set
    state = 'active',
    reviewed_at = now()
  where source_key = p_source_key
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Source not found for source_key=%', p_source_key;
  end if;

  return updated_row;
end;
$$;

create or replace function public.set_source_state(
  p_source_key text,
  p_state text,
  p_reason text,
  p_actor_user_id uuid
)
returns public.ingest_source_registry
language plpgsql
as $$
declare
  updated_row public.ingest_source_registry;
begin
  perform public.ingest_set_source_registry_audit_context(p_actor_user_id, p_reason);

  update public.ingest_source_registry
  set
    state = p_state,
    reviewed_at = case when state is distinct from p_state then now() else reviewed_at end
  where source_key = p_source_key
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Source not found for source_key=%', p_source_key;
  end if;

  return updated_row;
end;
$$;

create or replace function public.update_source_config(
  p_source_key text,
  p_patch jsonb,
  p_config_version text,
  p_actor_user_id uuid,
  p_reason text default null
)
returns public.ingest_source_registry
language plpgsql
as $$
declare
  normalized_patch jsonb;
  updated_row public.ingest_source_registry;
begin
  normalized_patch := coalesce(p_patch, '{}'::jsonb);
  perform public.ingest_set_source_registry_audit_context(p_actor_user_id, p_reason);

  update public.ingest_source_registry as src
  set
    domains = coalesce(public.ingest_jsonb_text_array(normalized_patch->'domains'), src.domains),
    content_type = coalesce(nullif(normalized_patch->>'content_type', ''), src.content_type),
    owner_team = coalesce(nullif(normalized_patch->>'owner_team', ''), src.owner_team),
    owner_user_id = case
      when normalized_patch ? 'owner_user_id'
        then nullif(normalized_patch->>'owner_user_id', '')::uuid
      else src.owner_user_id
    end,
    reviewed_at = case
      when normalized_patch ? 'reviewed_at'
        then nullif(normalized_patch->>'reviewed_at', '')::timestamptz
      else src.reviewed_at
    end,
    next_review_at = case
      when normalized_patch ? 'next_review_at'
        then nullif(normalized_patch->>'next_review_at', '')::timestamptz
      else src.next_review_at
    end,
    discovery_methods = coalesce(
      public.ingest_jsonb_text_array(normalized_patch->'discovery_methods'),
      src.discovery_methods
    ),
    seed_urls = coalesce(public.ingest_jsonb_text_array(normalized_patch->'seed_urls'), src.seed_urls),
    include_url_patterns = coalesce(
      public.ingest_jsonb_text_array(normalized_patch->'include_url_patterns'),
      src.include_url_patterns
    ),
    exclude_url_patterns = coalesce(
      public.ingest_jsonb_text_array(normalized_patch->'exclude_url_patterns'),
      src.exclude_url_patterns
    ),
    strategy_order = coalesce(
      public.ingest_jsonb_text_array(normalized_patch->'strategy_order'),
      src.strategy_order
    ),
    selector_profile_version = case
      when normalized_patch ? 'selector_profile_version'
        then nullif(normalized_patch->>'selector_profile_version', '')
      else src.selector_profile_version
    end,
    quality_threshold = case
      when normalized_patch ? 'quality_threshold'
        then (normalized_patch->>'quality_threshold')::numeric
      else src.quality_threshold
    end,
    cadence = case
      when normalized_patch ? 'cadence' then nullif(normalized_patch->>'cadence', '')
      else src.cadence
    end,
    max_rps = case
      when normalized_patch ? 'max_rps' then (normalized_patch->>'max_rps')::numeric
      else src.max_rps
    end,
    max_concurrency = case
      when normalized_patch ? 'max_concurrency' then (normalized_patch->>'max_concurrency')::integer
      else src.max_concurrency
    end,
    timeout_seconds = case
      when normalized_patch ? 'timeout_seconds' then (normalized_patch->>'timeout_seconds')::integer
      else src.timeout_seconds
    end,
    legal_risk_level = case
      when normalized_patch ? 'legal_risk_level'
        then nullif(normalized_patch->>'legal_risk_level', '')
      else src.legal_risk_level
    end,
    robots_checked_at = case
      when normalized_patch ? 'robots_checked_at'
        then nullif(normalized_patch->>'robots_checked_at', '')::timestamptz
      else src.robots_checked_at
    end,
    terms_checked_at = case
      when normalized_patch ? 'terms_checked_at'
        then nullif(normalized_patch->>'terms_checked_at', '')::timestamptz
      else src.terms_checked_at
    end,
    approved_for_prod = case
      when normalized_patch ? 'approved_for_prod'
        then (normalized_patch->>'approved_for_prod')::boolean
      else src.approved_for_prod
    end,
    last_run_at = case
      when normalized_patch ? 'last_run_at'
        then nullif(normalized_patch->>'last_run_at', '')::timestamptz
      else src.last_run_at
    end,
    last_success_at = case
      when normalized_patch ? 'last_success_at'
        then nullif(normalized_patch->>'last_success_at', '')::timestamptz
      else src.last_success_at
    end,
    rolling_promotion_rate_30d = case
      when normalized_patch ? 'rolling_promotion_rate_30d'
        then (normalized_patch->>'rolling_promotion_rate_30d')::numeric
      else src.rolling_promotion_rate_30d
    end,
    rolling_failure_rate_30d = case
      when normalized_patch ? 'rolling_failure_rate_30d'
        then (normalized_patch->>'rolling_failure_rate_30d')::numeric
      else src.rolling_failure_rate_30d
    end,
    config_version = coalesce(nullif(p_config_version, ''), src.config_version),
    metadata_json = case
      when normalized_patch ? 'metadata_json'
        then src.metadata_json || coalesce(normalized_patch->'metadata_json', '{}'::jsonb)
      else src.metadata_json
    end
  where src.source_key = p_source_key
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Source not found for source_key=%', p_source_key;
  end if;

  return updated_row;
end;
$$;

create or replace function public.list_active_sources()
returns setof public.ingest_source_registry
language sql
stable
as $$
  select *
  from public.ingest_source_registry
  where state = 'active'
    and approved_for_prod = true
  order by source_key asc;
$$;

create or replace function public.get_source_health(p_source_key text)
returns table (
  source_key text,
  state text,
  approved_for_prod boolean,
  last_run_at timestamptz,
  last_success_at timestamptz,
  rolling_promotion_rate_30d numeric,
  rolling_failure_rate_30d numeric,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    src.source_key,
    src.state,
    src.approved_for_prod,
    src.last_run_at,
    src.last_success_at,
    src.rolling_promotion_rate_30d,
    src.rolling_failure_rate_30d,
    src.updated_at
  from public.ingest_source_registry as src
  where src.source_key = p_source_key
  limit 1;
$$;

insert into public.ingest_source_registry (
  source_key,
  display_name,
  domains,
  content_type,
  state,
  owner_team,
  discovery_methods,
  seed_urls,
  strategy_order,
  quality_threshold,
  cadence,
  max_rps,
  max_concurrency,
  timeout_seconds,
  legal_risk_level,
  approved_for_prod,
  config_version
)
values (
  'rak',
  'Random Acts of Kindness',
  array['randomactsofkindness.org']::text[],
  'ideas',
  'active',
  'ingestion',
  array['index_page']::text[],
  array['https://www.randomactsofkindness.org/kindness-ideas']::text[],
  array['sitemap_html']::text[],
  0.5000,
  'FREQ=DAILY;BYHOUR=2;BYMINUTE=0',
  1.000,
  1,
  30,
  'low',
  true,
  '1'
)
on conflict (source_key) do nothing;
