-- Members can update their own display_name (see DisplayNameForm /
-- updateDisplayName) - discovered missing when the save silently did
-- nothing: profiles had a self-SELECT policy but no self-UPDATE policy
-- at all, only an admin-scoped one. RLS "for update" without a matching
-- policy just affects zero rows, no error - that's why it looked like it
-- worked but didn't.
--
-- RLS is row-level only, so a self-row UPDATE policy alone would let a
-- member update *any* column on their own row, including role/group_id/
-- pseudonym, via the blanket table-level UPDATE grant already in place
-- from 20260717000002_baseline_grants.sql. Column-level grants close
-- that: only display_name is actually settable by `authenticated`.

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
