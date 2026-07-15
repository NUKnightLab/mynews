-- Phase 2: Feed management (see DESIGN_BRIEF.md §3, PROJECT_PLAN.md Phase 2)
--
-- `sources` is a global, deduped registry of feed URLs shared across all
-- members (and future groups) - feed URLs aren't sensitive, and sharing one
-- row per URL means multiple members subscribing to the same feed don't
-- duplicate polling work in Phase 3. `type` is a pluggable source-type
-- discriminator (DESIGN_BRIEF.md §3); only 'rss' ships in v1.
--
-- `member_subscriptions` (who subscribes to what) stays strictly private -
-- self-select only. Cross-member viewing (Phase 6) goes through a ranked
-- output, never this table directly - see DESIGN_BRIEF.md §6.

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'rss' check (type in ('rss')),
  url text not null unique,
  title text,
  site_url text,
  created_at timestamptz not null default now()
);

create table public.member_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, source_id)
);

alter table public.sources enable row level security;
alter table public.member_subscriptions enable row level security;

-- Any authenticated member can read the source registry and add a new
-- source (i.e. subscribe to a feed URL nobody's added yet). No update/
-- delete policy for members - Phase 3's poller (service role) owns
-- updates, and unsubscribing removes the member_subscriptions row, not
-- the shared source row.
create policy sources_select_authenticated on public.sources
  for select to authenticated using (true);

create policy sources_insert_authenticated on public.sources
  for insert to authenticated with check (true);

create policy member_subscriptions_select_self on public.member_subscriptions
  for select using (profile_id = auth.uid());

create policy member_subscriptions_insert_self on public.member_subscriptions
  for insert with check (profile_id = auth.uid());

create policy member_subscriptions_delete_self on public.member_subscriptions
  for delete using (profile_id = auth.uid());
