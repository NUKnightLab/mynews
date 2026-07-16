-- Phase 6: Cross-member viewing (see DESIGN_BRIEF.md §6, PROJECT_PLAN.md Phase 6)
--
-- get_group_directory() and get_source_subscriber_counts() gain an
-- optional p_profile_id parameter (default auth.uid(), so existing
-- self-use callers are unaffected) so the ranking engine can compute
-- ANOTHER member's ranked view - using their private weights/affinity,
-- never exposed to the viewer - from a trusted server context.
--
-- Guarded inside the function itself, not just at the app layer: a
-- regular member can only ever get results for themselves or someone in
-- their OWN group, even if they call the RPC directly with an arbitrary
-- id. auth.uid() is null only for service-role/admin calls, which our
-- own server code only makes after already verifying group membership
-- (see src/app/(member)/members/[profileId]/page.tsx).

drop function if exists public.get_group_directory();

create function public.get_group_directory(p_profile_id uuid default auth.uid())
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.group_id = (select pr.group_id from public.profiles pr where pr.id = p_profile_id)
    and (
      auth.uid() is null
      or auth.uid() = p_profile_id
      or public.current_group_id() = (select pr.group_id from public.profiles pr where pr.id = p_profile_id)
    );
$$;

grant execute on function public.get_group_directory(uuid) to authenticated;

drop function if exists public.get_source_subscriber_counts();

create function public.get_source_subscriber_counts(p_profile_id uuid default auth.uid())
returns table (source_id uuid, subscriber_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select ms.source_id, count(*) as subscriber_count
  from public.member_subscriptions ms
  join public.profiles p on p.id = ms.profile_id
  where p.group_id = (select pr.group_id from public.profiles pr where pr.id = p_profile_id)
    and ms.profile_id <> p_profile_id
    and (
      auth.uid() is null
      or auth.uid() = p_profile_id
      or public.current_group_id() = (select pr.group_id from public.profiles pr where pr.id = p_profile_id)
    )
  group by ms.source_id;
$$;

grant execute on function public.get_source_subscriber_counts(uuid) to authenticated;
