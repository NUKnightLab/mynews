-- Phase 3: Ingestion (see DESIGN_BRIEF.md §3-4, PROJECT_PLAN.md Phase 3)
--
-- Items are readable by any authenticated member regardless of their own
-- subscriptions - like `sources`, this is public web content, and keeping
-- it globally readable is what makes cross-member viewing (Phase 6) work
-- without special-casing. Writes happen only via the service-role poller
-- (Vercel Cron -> src/app/api/cron/poll-feeds/route.ts), so there's no
-- insert/update policy for `authenticated` - default deny covers that.

alter table public.sources
  add column last_polled_at timestamptz,
  add column last_poll_error text;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  url text not null,
  title text not null,
  summary text,
  author text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (source_id, url)
);

create index items_source_id_idx on public.items (source_id);
create index items_published_at_idx on public.items (published_at);
create index items_fetched_at_idx on public.items (fetched_at);

alter table public.items enable row level security;

create policy items_select_authenticated on public.items
  for select to authenticated using (true);
