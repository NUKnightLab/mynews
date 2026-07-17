# RSS Filter

A small-cohort, configurable RSS reader. See [DESIGN_BRIEF.md](./DESIGN_BRIEF.md)
for the product spec and [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the phased
build plan.

## Local development

Local dev runs against a **local Supabase stack** (Postgres + Auth + REST,
all in Docker via `supabase start`) - not the hosted production project.
This is fully isolated per machine, no coordination with anyone else, no Supabase account needed. 

When the system would send email, those email messages end up in another locally-running webapp, so that you can test as multiple users without needing many email accounts.

### Prerequisites

- Node 22 (see `.nvmrc` - run `nvm use` if you use nvm)
- [Docker Desktop](https://docs.docker.com/desktop) (running)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`
  on macOS; `npm install -g supabase` does **not** work, it's blocked upstream)

### Setup

```bash
git clone <this repo>
cd rss-filter
npm install
cp .env.local.example .env.local   # local-stack defaults, already filled in
supabase start                      # first run pulls Docker images, takes a few minutes
npm run dev
```

That's it - no Supabase project to create, no email provider to configure.
`supabase start` prints local URLs including `STUDIO_URL` (a web UI for
browsing the local database) and `MAILPIT_URL` (captures every email the
app would have sent, instead of really sending it).

### Signing in locally

A **fresh** local database (right after `supabase start` or `supabase db
reset`) has exactly zero users in it. If you ever see accounts you didn't
create, that's stale data from an earlier session (yours or someone
else's) against this same local stack - not something the app seeds on
purpose. `supabase db reset` wipes it back to genuinely empty if you want
a clean slate.

Since invites are always admin-issued (even the first one), and there's no
admin yet on a fresh local database:

1. Open Supabase Studio (`STUDIO_URL` from the `start` output, normally
   `http://127.0.0.1:54323`) → **Authentication → Users → Add user → Send Invitation** → 
   enter your own email. (if you're having trouble finding **Authentication**, hover your mouse over the icon bar at the left of the browser.) The database trigger makes the **first person ever invited** an admin automatically. **Note: This does not actually send an email to your inbox, read on...**
2. Open Mailpit (`MAILPIT_URL`, normally `http://127.0.0.1:54324`) and
   find **that** invite - Mailpit keeps every message it has ever
   captured, so if you (or anyone) has tested this before, older invite
   emails will still be sitting there too. Clicking a stale one fails
   (each invite link is single-use) and dumps you on the sign-in page
   looking like something's broken, when really it's just the wrong
   email. Sort by date/subject, or clear Mailpit out first if it's
   cluttered (its UI has a delete-all action, or `curl -X DELETE
   http://127.0.0.1:54324/api/v1/messages`).
3. Click the "Accept invite" link in it. It points at
   `localhost:3001/auth/confirm?...`, so it lands you right in your local
   app. Every invite after the first one works the same way, and goes
   through the in-app admin UI (`/admin`) instead of Studio.

If you'd rather script it (e.g. for repeated testing) instead of clicking
through Studio/Mailpit each time, `scripts/debug-rank.ts` shows the pattern
for minting a session directly via the service-role admin API.

### Schema changes

Write and test migrations against the local stack:

```bash
supabase db reset   # replays every supabase/migrations/*.sql file from scratch
```

A clean reset is the real test of whether a migration is self-contained -
it catches things that "worked" only because some other instance already
had a setting a fresh database doesn't (see `20260717000002_baseline_grants.sql`
for a real example: table grants that the hosted project already had from
its own platform setup, which our own migrations had never had to declare
until a truly fresh database exposed the gap).

Only push migrations to the hosted project from `main`, after merging -
see `AGENTS.md` for why, and for the two rules (additive-first,
push-from-main-only) that keep a shared production database safe with
more than one person touching it.

## Deploying your own instance

The steps below are for standing up an independent deployment (your own
Supabase project, your own Vercel deployment) - not needed just to develop
locally, which uses the local stack above instead.

### 1. Create and link a Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Link the CLI to it:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

   `link` prompts for your database password, found under
   *Project Settings -> Database*.
3. Add a `[remotes.<name>]` override block to `supabase/config.toml` (see
   the existing `[remotes.production]` block for the pattern) with your
   project's ref and its own `site_url`/SMTP settings - these need to
   differ from local dev's, which is exactly what `[remotes.*]` is for.

### 2. Email setup

Supabase's free tier's default mailer can't send custom email templates,
which this app needs (see "Why a confirm-click page?" below). Configure
Gmail as a custom SMTP relay instead - **no custom domain required**, any
Gmail account works:

1. Enable 2-Step Verification on the Google account you'll send from, if
   it isn't already.
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
   (name it e.g. "RSS Filter").
3. Export both values in your shell before running `supabase config push`
   (do **not** put these in any `.env*` file - they're consumed by the
   CLI, not the Next.js app):

   ```bash
   export GMAIL_SMTP_USER="you@gmail.com"
   export GMAIL_SMTP_APP_PASSWORD="xxxx xxxx xxxx xxxx"
   ```

Institutional email (e.g. a university's Microsoft 365) often has SMTP
AUTH disabled by IT policy - a personal Gmail account is the more reliably
available option. A custom domain via Resend/Postmark/etc. is a nicer
upgrade later (a branded sender address) but is not required.

### 3. Push schema and config

```bash
supabase db push        # creates tables, RLS policies, triggers
supabase config push     # applies site_url, redirect URLs, and SMTP/email config
```

`config push` treats `supabase/config.toml` (plus your project's
`[remotes.*]` override) as the full source of truth for your project's
Auth settings - review the diff it prints before confirming.

### 4. Bootstrap the first admin and run it

Same as local: *Supabase dashboard -> Authentication -> Users -> Invite
user*, your own email - the first person ever invited becomes admin
automatically. Point `.env.local` (or your deployment's env vars) at this
project's real URL/keys instead of the local-stack defaults, and run
`npm run dev`.

Runs on the fixed port **3001** (not 3000 - see `package.json`), because
Supabase's redirect allow-list needs an exact origin match and a fixed
port makes that stable across restarts. If you change the port, update
the relevant `additional_redirect_urls` and run `supabase config push`
again.

## Why a confirm-click page instead of a direct sign-in link?

Institutional email systems (Microsoft Defender Safe Links, and similar
corporate/university link scanners) *prefetch* links in incoming email to
scan them for safety - including sign-in and invite links. If a link signs
you in / accepts an invite the moment it's fetched, the scanner burns the
single-use token before the actual recipient ever clicks it, and they see
an "expired or invalid" error.

`src/app/auth/confirm/page.tsx` fixes this: visiting the link (a GET
request, which is all a scanner does) only renders a page with a button -
nothing is verified yet. Verification only happens on the POST triggered
by an actual click (`src/app/auth/confirm/actions.ts`). Automated
prefetchers never click buttons, so the token survives until a real
person uses it.

This is why the app uses **custom** email templates
(`supabase/templates/*.html`, pointing at `/auth/confirm?token_hash=...`)
rather than Supabase's default `{{ .ConfirmationURL }}`, which goes
straight to Supabase's own auto-verifying endpoint - and why that in turn
requires custom SMTP for the hosted project (see "Email setup"), since the
free tier blocks template customization on its default mailer. Local dev
gets the custom templates too (harmless - they render fine in Mailpit),
without needing SMTP configured at all.
