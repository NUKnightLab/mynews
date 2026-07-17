<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local dev uses a local Supabase stack, not the hosted project

Local dev runs against `supabase start` (a full Postgres + Auth + REST
stack in Docker, entirely local) - **not** the hosted production
project. This is the actual local-Postgres-equivalent, and it's what
`.env.local` should point at (`http://127.0.0.1:54321` and the
well-known local demo keys `supabase start` prints - these are the same
for every local stack everywhere, not secrets).

The hosted project's credentials live in `.env.production.local`
(git-ignored, not read by `npm run dev`) for the rare cases that need to
talk to production directly (e.g. the admin invite/bootstrap trick in
README.md). Only pass that file to a command explicitly when you
actually mean to touch production:
`node --env-file=.env.production.local ...`.

**Schema changes**: write and test migrations against the local stack
(`supabase db reset` replays every `migrations/*.sql` file from
scratch - the fastest way to confirm a migration is self-contained and
actually reproducible, not just "worked because the hosted project
already had some state/grant it needed"). Only push to the hosted
project from `main`, after merging - `supabase link` state lives in
`supabase/.temp/` (git-ignored, per-machine), so anyone with the CLI
could technically push to the hosted project directly, but the
convention is: local stack for everyone's iteration, hosted project
touched only post-merge.

**config.toml has two audiences**: top-level `[auth]`/`[auth.email.*]`
values apply to `supabase start` (local). A `[remotes.<name>]` block
(matched to a linked project by `project_id`) overrides values only
when `supabase config push` targets *that* project - see
`[remotes.production]` at the end of the file, which is where the real
Gmail SMTP relay and (once deployed) the production `site_url` live.
Don't move email/SMTP/site_url settings back to the top level even if
it seems simpler - that's what caused local dev to silently try (and
fail) to send through Gmail with no credentials before this split
existed, instead of using its own built-in Mailpit capture.

**Grants, not just RLS**: every table needs an explicit `GRANT ... TO
authenticated` (see `20260717000002_baseline_grants.sql`) - don't rely
on a table "just working" because the hosted project happened to have
default privileges from its own platform bootstrapping. That gap is
invisible against the hosted project and fails immediately against a
fresh local stack with "permission denied for table X" (Postgres 42501,
*not* an RLS/policy error - RLS failures return empty rows, not this).
If a new table doesn't inherit the default-privilege migration's
grants for some reason, add an explicit grant for it.
