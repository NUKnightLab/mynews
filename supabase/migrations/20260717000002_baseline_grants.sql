-- Baseline role grants for public schema objects.
--
-- Discovered via a fresh `supabase start` (local Docker stack): queries
-- that should only be gated by RLS instead failed outright with
-- "permission denied for table X" (Postgres 42501). The hosted project
-- worked fine because Supabase's platform bootstrapping already grants
-- these at project-creation time - our migrations just never had to
-- declare them, since they'd never run against an instance that lacked
-- that implicit setup before now. Declaring them explicitly makes the
-- schema reproducible on any fresh Postgres+GoTrue+PostgREST instance,
-- local or hosted, not just this one project.
--
-- RLS remains the actual per-row gate (every policy above still applies
-- unchanged) - these grants only permit the operation category at all.
-- No `anon` grants: nothing in this app is meant to be reachable
-- unauthenticated, and every existing RLS policy is already scoped
-- `to authenticated` or checks `auth.uid()`, so anon would be denied by
-- RLS regardless.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- So future migrations' new tables/sequences/functions don't need this
-- repeated by hand.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
