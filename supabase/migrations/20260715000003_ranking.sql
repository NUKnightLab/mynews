-- Phase 4: Ranking engine (see DESIGN_BRIEF.md §4-5, PROJECT_PLAN.md Phase 4)
--
-- Two private, per-member tables:
--   member_weights: four global named dials the member can see and adjust
--     directly (a settings UI, Phase 5). Default 1.0 = neutral.
--   member_source_affinity: per-source nudges from "more/less like this"
--     feedback (Phase 5 wires the UI; schema is ready now). Default 0.0 =
--     neutral. This is the "feedback history" factor from §4 - scoped to
--     source rather than a full tagging system, since v1 has no per-item
--     tags (§4: metadata-only, no full-text/LLM analysis).
--
-- Both are strictly self-select/self-manage, matching the "weighting is
-- private" decision in DESIGN_BRIEF.md §3.

create table public.member_weights (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  recency double precision not null default 1 check (recency between 0 and 2),
  source_diversity double precision not null default 1 check (source_diversity between 0 and 2),
  corroboration double precision not null default 1 check (corroboration between 0 and 2),
  popularity double precision not null default 1 check (popularity between 0 and 2),
  updated_at timestamptz not null default now()
);

create table public.member_source_affinity (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  affinity double precision not null default 0 check (affinity between -1 and 1),
  updated_at timestamptz not null default now(),
  unique (profile_id, source_id)
);

alter table public.member_weights enable row level security;
alter table public.member_source_affinity enable row level security;

create policy member_weights_self on public.member_weights
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy member_source_affinity_self on public.member_source_affinity
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Every profile gets a default weights row automatically, so the ranking
-- engine never has to special-case "no weights yet."
create function public.create_default_weights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_weights (profile_id) values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_weights
  after insert on public.profiles
  for each row execute function public.create_default_weights();

-- Backfill for profiles created before this migration.
insert into public.member_weights (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

-- Group popularity (§4: "N members engaged with this", cheap proxy - how
-- many *other* members in the same group subscribe to each source).
-- security definer: a member can't otherwise see other members'
-- subscriptions at all (member_subscriptions is strictly self-select), so
-- this returns only aggregate counts, never who.
create function public.get_source_subscriber_counts()
returns table (source_id uuid, subscriber_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ms.source_id, count(*) as subscriber_count
  from public.member_subscriptions ms
  join public.profiles p on p.id = ms.profile_id
  where p.group_id = public.current_group_id()
    and ms.profile_id <> auth.uid()
  group by ms.source_id;
$$;

grant execute on function public.get_source_subscriber_counts() to authenticated;
