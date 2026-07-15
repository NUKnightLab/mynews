# RSS Filter

A small-cohort, configurable RSS reader. See [DESIGN_BRIEF.md](./DESIGN_BRIEF.md)
for the product spec and [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the phased
build plan.

## Setup (new deployment, e.g. a different admin standing up their own instance)

### 1. Prerequisites

- Node 22 (see `.nvmrc` - run `nvm use` if you use nvm)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`
  on macOS; `npm install -g supabase` does **not** work, it's blocked upstream)
- A [Supabase](https://supabase.com) account and project (free tier is fine)
- A Gmail account (or any email account you can send SMTP through) for
  sending invite/login emails - see "Email setup" below. No custom domain
  required.

### 2. Clone and install

```bash
git clone <this repo>
cd rss-filter
npm install
```

### 3. Create and link a Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Copy `.env.local.example` to `.env.local` and fill in the three values
   from *Project Settings -> API* (Project URL, `anon` key, `service_role`
   key).
3. Link the CLI to your project:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

   `link` prompts for your database password, found under
   *Project Settings -> Database*.

### 4. Email setup

Supabase's free tier's default mailer can't send custom email templates,
which this app needs (see "Why a confirm-click page?" below). Instead we
configure Gmail as a custom SMTP relay - **no custom domain required**,
any Gmail account works:

1. Enable 2-Step Verification on the Google account you'll send from, if
   it isn't already.
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
   (name it e.g. "RSS Filter").
3. Export both values in your shell before running `supabase config push`
   (do **not** put these in `.env.local` - they're consumed by the CLI,
   not the Next.js app):

   ```bash
   export GMAIL_SMTP_USER="you@gmail.com"
   export GMAIL_SMTP_APP_PASSWORD="xxxx xxxx xxxx xxxx"
   ```

Institutional email (e.g. a university's Microsoft 365) often has SMTP
AUTH disabled by IT policy - a personal Gmail account is the more reliably
available option. A custom domain via Resend/Postmark/etc. is a nicer
upgrade later (a branded sender address) but is not required to run this
app.

### 5. Push schema and config

```bash
supabase db push        # creates tables, RLS policies, triggers
supabase config push     # applies site_url, redirect URLs, and SMTP/email config
```

`config push` treats `supabase/config.toml` as the full source of truth
for your project's Auth settings - review the file before pushing if
you've changed anything, since it overwrites unrelated remote settings
back to whatever's in the file.

### 6. Bootstrap the first admin

Invites are always admin-issued - including the very first one. Since
there's no admin yet, send yourself the first invite manually:

*Supabase dashboard -> Authentication -> Users -> Invite user*, enter your
own email. The database migration makes the **first person ever invited**
an admin automatically, regardless of any role metadata. Every invite
after that goes through the in-app admin UI (`/admin`) instead.

### 7. Run it

```bash
npm run dev
```

Runs on the fixed port **3001** (not 3000 - see `package.json`), because
Supabase's redirect allow-list needs an exact origin match and a fixed
port makes that stable across restarts. If you change the port, update
`additional_redirect_urls` in `supabase/config.toml` and run
`supabase config push` again.

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
requires custom SMTP (see "Email setup"), since the free tier blocks
template customization on its default mailer.
