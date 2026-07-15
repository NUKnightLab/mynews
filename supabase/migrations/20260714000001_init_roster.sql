-- Phase 1: Identity & roster (see DESIGN_BRIEF.md §2, PROJECT_PLAN.md Phase 1)
--
-- Bootstrap rule: the very first profile ever created becomes 'admin'
-- regardless of invite metadata. Every user account (including the first)
-- is still created via an admin-issued invite - either through the
-- Supabase dashboard (Authentication -> Users -> Invite user) for the very
-- first admin, or through this app's invite flow afterward. Self-service
-- sign-up is never enabled (see src/app/login/page.tsx: shouldCreateUser
-- is false), so this bootstrap rule never lets an uninvited person in -
-- it only decides *which role* the first invited person gets.

create extension if not exists pgcrypto;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.groups (name) values ('Default')
on conflict (name) do nothing;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id),
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text not null,
  -- Stable ID for survey/diary responses (DESIGN_BRIEF.md §7). Never
  -- exposed in cross-member views; only readable via is_admin() below,
  -- and app UI must not join it back to display_name when rendering
  -- results (see Phase 7).
  pseudonym text not null unique,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.profiles enable row level security;

-- security definer + fixed search_path: these run with elevated
-- privileges to avoid RLS self-recursion when a policy on `profiles`
-- needs to check the caller's own role/group, so the search_path is
-- pinned to prevent hijacking via a session-local search_path.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function public.current_group_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

-- profiles: a member can read only their own row; admins can read/manage
-- every row in their own group. No policy exposes another member's
-- pseudonym - cross-member browsing (Phase 6) goes through
-- get_group_directory() below instead, which never selects it.
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all using (public.is_admin() and group_id = public.current_group_id())
  with check (public.is_admin() and group_id = public.current_group_id());

-- groups: admin-only for now (members never browse the groups table
-- directly; get_group_directory() covers what they need).
create policy groups_admin_all on public.groups
  for all using (public.is_admin())
  with check (public.is_admin());

-- Cross-member directory (DESIGN_BRIEF.md §6): any member can list the
-- other members in their own group by id/display_name only - never
-- pseudonym, weights, or anything else. security definer + explicit
-- group_id filter (not naive RLS pass-through) is what actually enforces
-- the column hiding.
create function public.get_group_directory()
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.group_id = public.current_group_id();
$$;

grant execute on function public.get_group_directory() to authenticated;

-- Creates a profile row whenever a new auth user is created (via invite
-- or, for the very first admin, via the Supabase dashboard). Role/group
-- come from invite metadata; the first-ever profile is forced to 'admin'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data ->> 'role', 'member');
  chosen_group_id uuid;
begin
  if not exists (select 1 from public.profiles) then
    chosen_role := 'admin';
  end if;

  select coalesce(
    (new.raw_user_meta_data ->> 'group_id')::uuid,
    (select id from public.groups order by created_at limit 1)
  ) into chosen_group_id;

  insert into public.profiles (id, group_id, role, display_name, pseudonym)
  values (
    new.id,
    chosen_group_id,
    chosen_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'M-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
