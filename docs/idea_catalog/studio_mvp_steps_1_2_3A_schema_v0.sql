-- Rekindle Studio MVP schema (Steps 1, 2, 3A)
-- Created: 2026-02-25
-- Purpose:
--   - Studio auth allowlist table
--   - Draft authoring tables
--   - RLS policies for viewer/editor/admin roles
--   - Safe to copy into dedicated rekindle_db migrations repo

begin;

-- =============================
-- 1) Studio allowlist + roles
-- =============================
create table if not exists public.studio_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

-- =============================
-- 2) Draft entities
-- =============================
create table if not exists public.idea_drafts (
  id uuid primary key default gen_random_uuid(),
  title text,
  reason_snippet text,
  description text,
  steps text,
  what_you_need text,
  tips_or_variations text,
  safety_or_boundaries_note text,
  min_minutes integer check (min_minutes is null or min_minutes >= 0),
  max_minutes integer check (max_minutes is null or max_minutes >= 0),
  active boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'review', 'publishable', 'exported')),
  source_url text,
  editorial_note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  exported_at timestamptz
);

create index if not exists idea_drafts_status_idx on public.idea_drafts(status);
create index if not exists idea_drafts_updated_at_idx on public.idea_drafts(updated_at desc);
create index if not exists idea_drafts_active_idx on public.idea_drafts(active);

create table if not exists public.idea_draft_traits (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.idea_drafts(id) on delete cascade,
  trait_type_id uuid not null references public.trait_types(id) on delete restrict,
  trait_option_id uuid not null references public.trait_options(id) on delete restrict,
  select_mode text not null check (select_mode in ('single', 'multi')),
  created_at timestamptz not null default now(),
  unique (draft_id, trait_type_id, trait_option_id)
);

create index if not exists idea_draft_traits_draft_id_idx
  on public.idea_draft_traits(draft_id);
create index if not exists idea_draft_traits_trait_type_id_idx
  on public.idea_draft_traits(trait_type_id);
create index if not exists idea_draft_traits_trait_option_id_idx
  on public.idea_draft_traits(trait_option_id);

-- Optional stricter integrity for single-select trait rows:
-- create unique index if not exists idea_draft_traits_single_mode_unique_idx
--   on public.idea_draft_traits(draft_id, trait_type_id)
--   where select_mode = 'single';

-- Keep updated_at fresh on every idea_drafts update.
create or replace function public.set_idea_drafts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_idea_drafts_updated_at on public.idea_drafts;
create trigger trg_set_idea_drafts_updated_at
before update on public.idea_drafts
for each row
execute function public.set_idea_drafts_updated_at();

-- =============================
-- 3) Role helper functions
-- =============================
-- Security-definer wrappers avoid RLS recursion problems when policies need
-- to check role membership.
create or replace function public.current_studio_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select su.role
  from public.studio_users su
  where su.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_studio_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_studio_role() in ('viewer', 'editor', 'admin');
$$;

create or replace function public.is_studio_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_studio_role() in ('editor', 'admin');
$$;

create or replace function public.is_studio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_studio_role() = 'admin';
$$;

revoke all on function public.current_studio_role() from public;
revoke all on function public.is_studio_user() from public;
revoke all on function public.is_studio_editor_or_admin() from public;
revoke all on function public.is_studio_admin() from public;

grant execute on function public.current_studio_role() to authenticated;
grant execute on function public.is_studio_user() to authenticated;
grant execute on function public.is_studio_editor_or_admin() to authenticated;
grant execute on function public.is_studio_admin() to authenticated;

-- =============================
-- 4) Privileges + RLS
-- =============================
grant select, insert, update, delete on table public.studio_users to authenticated;
grant select, insert, update, delete on table public.idea_drafts to authenticated;
grant select, insert, update, delete on table public.idea_draft_traits to authenticated;

alter table public.studio_users enable row level security;
alter table public.idea_drafts enable row level security;
alter table public.idea_draft_traits enable row level security;

-- studio_users
drop policy if exists studio_users_select_self_or_admin on public.studio_users;
create policy studio_users_select_self_or_admin
on public.studio_users
for select
to authenticated
using (user_id = auth.uid() or public.is_studio_admin());

drop policy if exists studio_users_insert_admin_only on public.studio_users;
create policy studio_users_insert_admin_only
on public.studio_users
for insert
to authenticated
with check (public.is_studio_admin());

drop policy if exists studio_users_update_admin_only on public.studio_users;
create policy studio_users_update_admin_only
on public.studio_users
for update
to authenticated
using (public.is_studio_admin())
with check (public.is_studio_admin());

drop policy if exists studio_users_delete_admin_only on public.studio_users;
create policy studio_users_delete_admin_only
on public.studio_users
for delete
to authenticated
using (public.is_studio_admin());

-- idea_drafts
drop policy if exists idea_drafts_select_studio_users on public.idea_drafts;
create policy idea_drafts_select_studio_users
on public.idea_drafts
for select
to authenticated
using (public.is_studio_user());

drop policy if exists idea_drafts_insert_editors on public.idea_drafts;
create policy idea_drafts_insert_editors
on public.idea_drafts
for insert
to authenticated
with check (public.is_studio_editor_or_admin());

drop policy if exists idea_drafts_update_editors on public.idea_drafts;
create policy idea_drafts_update_editors
on public.idea_drafts
for update
to authenticated
using (public.is_studio_editor_or_admin())
with check (public.is_studio_editor_or_admin());

drop policy if exists idea_drafts_delete_admin_only on public.idea_drafts;
create policy idea_drafts_delete_admin_only
on public.idea_drafts
for delete
to authenticated
using (public.is_studio_admin());

-- idea_draft_traits
drop policy if exists idea_draft_traits_select_studio_users on public.idea_draft_traits;
create policy idea_draft_traits_select_studio_users
on public.idea_draft_traits
for select
to authenticated
using (public.is_studio_user());

drop policy if exists idea_draft_traits_insert_editors on public.idea_draft_traits;
create policy idea_draft_traits_insert_editors
on public.idea_draft_traits
for insert
to authenticated
with check (public.is_studio_editor_or_admin());

drop policy if exists idea_draft_traits_update_editors on public.idea_draft_traits;
create policy idea_draft_traits_update_editors
on public.idea_draft_traits
for update
to authenticated
using (public.is_studio_editor_or_admin())
with check (public.is_studio_editor_or_admin());

drop policy if exists idea_draft_traits_delete_editors on public.idea_draft_traits;
create policy idea_draft_traits_delete_editors
on public.idea_draft_traits
for delete
to authenticated
using (public.is_studio_editor_or_admin());

commit;

-- Bootstrap note:
-- After migration, insert your first admin using a service-role / SQL editor session:
--   insert into public.studio_users (user_id, role) values ('<auth_user_uuid>', 'admin');
