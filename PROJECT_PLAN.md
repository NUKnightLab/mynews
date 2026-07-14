# Project Plan: RSS Filter

Based on [DESIGN_BRIEF.md](./DESIGN_BRIEF.md) (Final v1). Phases are ordered
by dependency, not necessarily by calendar time — each phase produces
something runnable/testable before moving on.

## Phase 0 — Project Scaffolding
- Initialize Next.js (TypeScript) app, git repo.
- Create Supabase project (Postgres + Auth). Wire up local env config and
  Supabase client.
- Connect repo to Vercel for deploys.
- Base layout, admin vs. member route separation, empty dashboard shells.

## Phase 1 — Identity & Roster
- Supabase Auth: magic-link login.
- Admin invite flow (admin enters an email, Supabase sends the invite).
- `member` / `admin` roles; `group` field on members (single default group
  for now, per §2).
- Row-level security policies scaffolded early (even if minimal at this
  stage) so later phases add data into an access-controlled model rather
  than retrofitting it.

## Phase 2 — Feed Management
- Data model: `sources` (pluggable source-type interface, RSS/Atom
  implementation only for v1), `member_subscriptions` linking members to
  sources.
- Member UI: add/remove/edit feed URLs.
- Validate feed URLs on add (fetch + parse check).

## Phase 3 — Ingestion
- `items` table: normalized fields (title, link, published date, summary,
  source, author).
- Vercel Cron job polling subscribed feeds on a schedule, parsing, and
  upserting items (dedupe by canonical link).
- Basic retention job: prune items older than the configured window (§8).

## Phase 4 — Ranking Engine
- Weight model: named factors (recency, source diversity, cross-feed
  corroboration, group popularity, feedback history — §4), stored
  per-member.
- Scoring function producing, per item, a final score **and** structured
  provenance (which factors contributed, how much) — required for §5.
- Default weight profile for new members.
- Keep this module isolated (pure functions over items + weights →
  ranked+annotated list) so it's independently testable.

## Phase 5 — Reading UI
- Member's personalized ranked feed view, built on Phase 4's output.
- "Why am I seeing this" affordance surfacing provenance.
- Reason-specific more/less controls wired back into the member's stored
  weights (§5) — this is the same mutation path as the settings sliders.
- Weight-adjustment UI (sliders/toggles) as an explicit settings screen.

## Phase 6 — Cross-Member Viewing
- Read-only route: view another member's current ranked output using
  *their* weights, rendered the same way as Phase 5's view.
- No exposure of their subscription list or weight values (§6) — reuse the
  Phase 4 output shape, strip provenance/weight detail before rendering to
  a non-owner.

## Phase 7 — Survey Module (architecturally separate from Phases 2–6)
- Own data domain: `instruments`, `questions`, `assignments`, `responses`,
  keyed by each member's pseudonymous ID (§7) rather than their identity
  directly in the responses table.
- Admin: instrument builder (question text, response type),
  assignment/scheduling (which members, which instrument, when).
- Member: a simple "you have a pending instrument" prompt + response form,
  no access to past responses.
- Admin results view: per-response and aggregate, pseudonymous.

## Phase 8 — Media Diary
- Deferred format decision (§7) — revisit at this phase once the rest of
  the app's shape is stable. Likely reuses much of Phase 7's
  instrument/assignment machinery (a diary is a repeatable instrument with
  its own entry form) rather than being a wholly separate system.

## Phase 9 — Retention Tooling & Consent
- Admin "export, then purge" action for survey/diary data (§8).
- First-login consent/notice screen.

## Phase 10 — Polish & Launch Checklist
- End-to-end pass with a couple of real accounts: invite → add feeds →
  read ranked view → adjust weights → give more/less feedback → view
  another member's feed → complete a survey instrument.
- Confirm RLS policies actually enforce the three privacy tiers (§8), not
  just app-level checks.
- Deploy checklist: Supabase prod project, Vercel env vars, cron schedule
  confirmed live.

---

**Suggested build order for the first working slice**: Phases 0–5 get you a
single-user-usable app (login, feeds, ranked reading, transparent
more/less). Phase 6 adds the cross-member view. Phases 7–9 are the
research-instrument track and can start any time after Phase 1 (roster)
since they're intentionally decoupled from the feed engine.
