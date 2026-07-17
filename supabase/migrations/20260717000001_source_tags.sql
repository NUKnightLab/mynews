-- Source tags + tag weighting (see DESIGN_BRIEF.md §4's illustrative
-- "matches your tag: climate" example, not built in Phase 4 since v1
-- scope had no tagging UI yet).
--
-- Tags are personal, like weights/affinity - a member's own tags on a
-- source (e.g. "climate", "local") are not shared with other members,
-- consistent with "weighting is private" (DESIGN_BRIEF.md §3). Tag
-- weights follow the exact same shape/lifecycle as
-- member_source_affinity: no row until the first more/less nudge,
-- default (absent) = neutral.

create table public.member_source_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (profile_id, source_id, tag)
);

create table public.member_tag_weights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 40),
  weight double precision not null default 0 check (weight between -1 and 1),
  updated_at timestamptz not null default now(),
  unique (profile_id, tag)
);

create index member_source_tags_profile_source_idx
  on public.member_source_tags (profile_id, source_id);

alter table public.member_source_tags enable row level security;
alter table public.member_tag_weights enable row level security;

create policy member_source_tags_self on public.member_source_tags
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy member_tag_weights_self on public.member_tag_weights
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
