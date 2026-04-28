-- Draft only. Do not apply from rekindle_web.
-- Copy/adapt/test this in rekindle-db as a new migration there.
--
-- Purpose:
--   - retire draft statuses `review` and `exported`
--   - add durable draft -> idea linkage
--   - add publish metadata
--   - add a DB-owned publish RPC:
--       public.idea_draft_publish_to_idea(p_draft_id uuid, p_actor_user_id uuid)
--
-- Notes:
--   - This is a handoff artifact, not an applied migration in this repo.
--   - It assumes the existing Studio role helpers from 0045 and trait registry
--     tables from 0016/0017 already exist.
--   - Old draft statuses are normalized conservatively:
--       review   -> draft
--       exported -> publishable
--     This avoids falsely marking old rows as `published` when no linked
--     canonical idea exists yet.

begin;

-- =============================================================================
-- 1) Schema updates
-- =============================================================================

alter table if exists public.idea_drafts
  add column if not exists idea_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'idea_drafts'
      and column_name = 'exported_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'idea_drafts'
      and column_name = 'published_at'
  ) then
    alter table public.idea_drafts
      rename column exported_at to published_at;
  end if;
end $$;

alter table if exists public.idea_drafts
  add column if not exists published_at timestamptz;

alter table if exists public.idea_drafts
  add column if not exists published_by uuid
    references auth.users(id) on delete set null;

create unique index if not exists uq_idea_drafts__idea_id
on public.idea_drafts(idea_id)
where idea_id is not null;

create index if not exists idx_idea_drafts__idea_id
on public.idea_drafts(idea_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_idea_drafts__idea_id'
  ) then
    alter table public.idea_drafts
      add constraint fk_idea_drafts__idea_id
      foreign key (idea_id)
      references public.ideas(id)
      on delete set null;
  end if;
end $$;

update public.idea_drafts
set status = 'draft'
where status = 'review';

update public.idea_drafts
set status = 'publishable'
where status = 'exported';

alter table if exists public.idea_drafts
  drop constraint if exists idea_drafts_status_check;

alter table if exists public.idea_drafts
  drop constraint if exists chk_idea_drafts__status;

alter table public.idea_drafts
  add constraint chk_idea_drafts__status
  check (status in ('draft', 'publishable', 'published'));

-- =============================================================================
-- 2) Helper functions
-- =============================================================================

create or replace function public.idea_draft_assert_publish_actor(
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid := coalesce(p_actor_user_id, auth.uid());
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return v_actor_user_id;
  end if;

  if v_actor_user_id is null then
    raise exception 'auth.uid() is required';
  end if;

  if not public.is_studio_editor_or_admin() then
    raise exception 'studio editor or admin role required';
  end if;

  return v_actor_user_id;
end;
$$;

revoke all on function public.idea_draft_assert_publish_actor(uuid) from public;
grant execute on function public.idea_draft_assert_publish_actor(uuid) to authenticated;
grant execute on function public.idea_draft_assert_publish_actor(uuid) to service_role;

create or replace function public.idea_draft_slug_base(p_title text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'idea'
  );
$$;

revoke all on function public.idea_draft_slug_base(text) from public;
grant execute on function public.idea_draft_slug_base(text) to authenticated;
grant execute on function public.idea_draft_slug_base(text) to service_role;

create or replace function public.idea_draft_unique_slug(
  p_title text,
  p_draft_id uuid,
  p_existing_idea_id uuid default null
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 0;
begin
  v_base := public.idea_draft_slug_base(p_title);
  v_candidate := v_base;

  loop
    exit when not exists (
      select 1
      from public.ideas i
      where i.slug = v_candidate
        and (p_existing_idea_id is null or i.id <> p_existing_idea_id)
    );

    v_suffix := v_suffix + 1;

    if v_suffix = 1 then
      v_candidate := v_base || '-' || left(p_draft_id::text, 8);
    else
      v_candidate := v_base || '-' || left(p_draft_id::text, 8) || '-' || v_suffix::text;
    end if;
  end loop;

  return v_candidate;
end;
$$;

revoke all on function public.idea_draft_unique_slug(text, uuid, uuid) from public;
grant execute on function public.idea_draft_unique_slug(text, uuid, uuid) to authenticated;
grant execute on function public.idea_draft_unique_slug(text, uuid, uuid) to service_role;

-- =============================================================================
-- 3) Publish RPC
-- =============================================================================

create or replace function public.idea_draft_publish_to_idea(
  p_draft_id uuid,
  p_actor_user_id uuid
)
returns table (
  draft_id uuid,
  idea_id uuid,
  created_idea boolean,
  draft_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_draft public.idea_drafts%rowtype;
  v_idea_id uuid;
  v_created_idea boolean := false;
  v_effort_id uuid;
  v_default_cadence_tag_id uuid;
  v_slug text;
begin
  v_actor_user_id := public.idea_draft_assert_publish_actor(p_actor_user_id);

  if p_draft_id is null then
    raise exception 'draft_id is required';
  end if;

  select d.*
  into v_draft
  from public.idea_drafts d
  where d.id = p_draft_id
  for update;

  if not found then
    raise exception 'idea draft not found';
  end if;

  if v_draft.status not in ('publishable', 'published') then
    raise exception 'draft must be publishable or published';
  end if;

  if nullif(btrim(v_draft.title), '') is null then
    raise exception 'draft title is required';
  end if;

  select e.id
  into v_effort_id
  from public.idea_draft_traits dt
  join public.trait_types tt
    on tt.id = dt.trait_type_id
   and tt.slug = 'effort'
  join public.trait_options topt
    on topt.id = dt.trait_option_id
  join public.efforts e
    on e.slug = topt.slug
  where dt.draft_id = p_draft_id
  order by dt.created_at asc
  limit 1;

  select dt.trait_option_id
  into v_default_cadence_tag_id
  from public.idea_draft_traits dt
  join public.trait_types tt
    on tt.id = dt.trait_type_id
   and tt.slug = 'cadence_tag'
  where dt.draft_id = p_draft_id
  order by dt.created_at asc
  limit 1;

  if v_draft.idea_id is null then
    v_slug := public.idea_draft_unique_slug(v_draft.title, v_draft.id, null);

    insert into public.ideas (
      slug,
      title,
      description,
      reason_snippet,
      min_minutes,
      max_minutes,
      effort_id,
      default_cadence_tag_id,
      created_by_user_id,
      is_global,
      is_deleted
    )
    values (
      v_slug,
      v_draft.title,
      v_draft.description,
      v_draft.reason_snippet,
      v_draft.min_minutes,
      v_draft.max_minutes,
      v_effort_id,
      v_default_cadence_tag_id,
      v_actor_user_id,
      true,
      false
    )
    returning id into v_idea_id;

    v_created_idea := true;
  else
    select i.id
    into v_idea_id
    from public.ideas i
    where i.id = v_draft.idea_id
    for update;

    if not found then
      raise exception 'linked idea not found for draft';
    end if;

    update public.ideas i
    set
      title = v_draft.title,
      description = v_draft.description,
      reason_snippet = v_draft.reason_snippet,
      min_minutes = v_draft.min_minutes,
      max_minutes = v_draft.max_minutes,
      effort_id = v_effort_id,
      default_cadence_tag_id = v_default_cadence_tag_id,
      is_deleted = false
    where i.id = v_idea_id;
  end if;

  delete from public.idea_traits it
  where it.idea_id = v_idea_id;

  insert into public.idea_traits (
    idea_id,
    trait_option_id,
    trait_type_id,
    trait_select_mode
  )
  select
    v_idea_id,
    dt.trait_option_id,
    dt.trait_type_id,
    dt.select_mode
  from public.idea_draft_traits dt
  where dt.draft_id = p_draft_id;

  update public.idea_drafts d
  set
    idea_id = v_idea_id,
    status = 'published',
    published_at = now(),
    published_by = v_actor_user_id,
    updated_by = coalesce(v_actor_user_id, d.updated_by)
  where d.id = p_draft_id;

  return query
  select
    p_draft_id,
    v_idea_id,
    v_created_idea,
    'published'::text;
end;
$$;

revoke all on function public.idea_draft_publish_to_idea(uuid, uuid) from public;
grant execute on function public.idea_draft_publish_to_idea(uuid, uuid) to authenticated;
grant execute on function public.idea_draft_publish_to_idea(uuid, uuid) to service_role;

commit;
