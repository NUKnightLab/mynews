# Design Brief: mynews (working title)

Status: FINAL v1
Date: 2026-07-14

## 1. Purpose

A small-cohort web application where a modest group of approved,
non-technical users each curate a personal list of RSS feeds and read an
algorithmically surfaced "best of" view across those feeds. Users tune the
surfacing algorithm with simple, transparent, named controls; can browse
another member's current personalized view (as a deliberate check against
filter-bubble effects, not a social/social-proof feature); and can give
per-item feedback ("more/less like this") that visibly maps to the same
weights they can adjust directly. The system separately supports an
admin-run pre-test survey (repeatable, pseudonymous) and a media-diary
day-log, kept architecturally independent of the feed/ranking engine.

Goal, in the user's words: give people "an experience of having more
control over their news consumption."

The system is not currently tied to a formal research study, but survey and
diary data are handled at research-appropriate privacy standards (see §7)
since that status could change without requiring a rebuild.

## 2. Users & Roles

- **Members**: invite-only, small group (under ~20 to start). Each member
  maintains their own feed list and their own algorithm weights.
- **Administrator**: initially just the project owner. Creates and manages
  invites, administers survey/diary instruments, and is the only party who
  can view survey/diary responses (pseudonymized — see §7).
- **Future (not built in v1, not precluded)**: multiple administrators,
  each scoped to a distinct group of members (separate cohorts/studies),
  with group-scoped data visibility. The data model includes a `group`
  concept from day one, even with only one group in v1.
- Invites are admin-issued (email-based magic link), not self-service
  signup.

## 3. Feeds

- Each member adds RSS/Atom feed URLs to their own list.
- The system polls feeds on a schedule (cadence TBD at implementation,
  starting around every 15–30 min) and stores normalized items: title,
  link, published date, summary, source feed, author if present.
- The ingestion layer is built around a pluggable "source type" interface
  rather than being RSS-specific throughout, so other source types
  (podcasts, YouTube, Mastodon, etc.) can be added later without a rework.
  v1 ships RSS/Atom only.

## 4. Ranking / Surfacing Algorithm

- Surfaces the "best" items across a member's subscribed feeds — not
  simple reverse-chronological.
- Configurable via simple, named weighting controls (sliders or toggle
  groups — "more of this / less of that"), not exposed numeric parameters.
- Inputs are metadata-only: title, summary, source, date, link, and
  user-applied tags. No full-article-text fetching, no paid LLM or
  embedding calls — the engine stays rule-based and cheap to run. (See
  §11 for a potential future evolution that stays within the no-fetch
  constraint.)
- Candidate weighting dimensions:
  - Recency
  - Source diversity (prevents one prolific feed from dominating)
  - Cross-feed corroboration — same story appearing across a member's own
    feeds, detected via cheap exact/near-exact signals only (canonical
    link or exact-title match). No story-clustering NLP. Low priority for
    v1; may be cut if it doesn't fall out easily from the metadata.
  - Group popularity ("N members engaged with this") — same low priority
    and same constraint (simple signals only).
  - Per-item explicit feedback history (§5)
- Each surfaced item carries structured provenance — which named factors
  contributed to its score, and how much — not just a final number. This
  is required for §5 to work and should shape the ranking engine's
  internal data model from the start.

## 5. In-Feed "More/Less Like This"

- Every item has a "why am I seeing this" affordance showing the named
  factors from §4 that contributed to its ranking.
- The more/less gesture targets a *specific reason*, not a generic
  up/down vote: if an item ranks up for two reasons (e.g. "source
  diversity" and "matches your tag: climate"), the member can say "less
  because of this tag" without affecting the other factor. If only one
  reason applies, the gesture is unambiguous.
- Implicit feedback (more/less clicks) and explicit slider adjustment are
  the same underlying mechanism seen from two angles — nothing moves a
  weight the member can't see and trace back to a click.

## 6. Cross-Member Feed Viewing

- A member can view another member's feed exactly as it currently looks to
  them — i.e., that member's live ranked output.
- Motivation is explicitly anti-filter-bubble: a way to be reminded of news
  outside one's own tuned feed, not a social/discovery feature.
- Scope is intentionally narrow: **only** the current ranked view. No
  browsable list of another member's raw feed subscriptions, and no
  visibility into their weight settings — both stay private. This is
  simpler than originally scoped (an earlier draft considered exposing
  subscription lists too; that's dropped).

## 7. Survey Instrument & Media Diary

Two admin-run instruments, deliberately kept **architecturally orthogonal**
to the feed/ranking engine — separate data domain, separate UI surface,
buildable and evolvable independently:

- **Pre-test survey**: administered once near the start of a member's
  participation, with optional repeat administrations (possibly with
  different questions) at other points.
- **Media diary**: a day-log of media consumption, most likely administered
  as a baseline before the main experience and optionally again later.
  Exact format (structured fields vs. free text vs. a mix) is intentionally
  deferred — not needed to start building the core app, and both
  instruments are expected to be elaborated over time.
- **Visibility**: admin-only. Members never see their own past responses.
- **Identity handling — pseudonymous, not fully anonymous**: each member
  has a stable pseudonymous ID used throughout the admin's survey/diary
  views; no name or email ever appears there. The underlying mapping from
  real identity to pseudonym exists (the system must know who to send
  instruments to) but is never surfaced in results. This preserves the
  ability to track one person's responses over time and, if desired, join
  them against that person's own usage/weighting behavior — which full
  anonymization would have ruled out.
- **Survey builder needs**: question text, response type (likert, multiple
  choice, free text), scheduling/assignment (which members, which
  instrument, when), and an admin results view (per-response and
  aggregate, pseudonymous).

## 8. Privacy & Data Retention

**Privacy tiers:**
1. Feed reading views (§6) — visible to all members, live/ephemeral (not a
   persisted browsing history exposed to others).
2. Per-member weights and feedback history — private to that member.
3. Survey/diary responses — admin-only, pseudonymous (§7).

**Retention:**
- Survey/diary responses: retained through the life of the project plus a
  defined analysis window (default: +12 months), then the admin exports
  what's needed and purges via a deliberate export-then-purge action
  (no silent auto-deletion — timing stays in the admin's control).
- Feed items / cached content: low sensitivity (public RSS content), rolled
  off by age (default: ~90–180 days) purely for storage hygiene.
- Account/roster data: retained while a member is active; removed or
  anonymized on offboarding at the admin's discretion.
- If this becomes IRB-governed later, the study's data management plan
  supersedes these defaults — tightening is straightforward, not a rebuild.

**Consent:** a lightweight consent/notice step at first login, describing
what's collected, who sees it, and how it's used.

## 9. Tech Stack

- **App**: Next.js (TypeScript) deployed on **Vercel** — git-push deploys,
  no server to patch, built-in Vercel Cron for scheduled feed polling
  (no separate worker process to operate).
- **Database + Auth**: **Supabase** (managed Postgres, zero admin burden).
  Supabase Auth provides magic-link and admin-issued email-invite flows
  out of the box, so no separate email infrastructure is needed. Row-level
  security enforces the privacy tiers from §8 (e.g. "survey responses are
  admin-only") at the database layer.
- Net effect: two managed services, both with free tiers adequate for
  under-20 users, no servers to operate.

## 10. Out of Scope for v1

- Multi-admin / multi-group partitioning (data model allows for it; not
  built).
- Non-RSS feed source types (ingestion layer allows for it; not built).
- Story-clustering NLP / any paid LLM or embedding calls. (Concern is
  external API cost/complexity, not embeddings in general — see §11.)
- Browsable subscription lists for other members (dropped — see §6).
- Member-side survey/diary response history.
- Public-facing/unauthenticated access — closed, invite-only tool.

## 11. Potential Future Path: Per-Item Semantic Tagging (exploratory, not scheduled)

Not part of v1; recorded for later consideration, once §4/§5 are built and
stable. Technical approach lives in PROJECT_PLAN.md.

- Today's tags are member-applied to an entire source. Per-item tags,
  generated automatically from each story, would let a member tune the
  feed on actual story-level topics instead of a coarse guess about what
  a whole feed covers.
- Stays within the no-fetch constraint (§4) — uses only metadata already
  stored per item, no full-article text.
- Would surface through the existing §5 "why am I seeing this" /
  more-less mechanism as another named factor, not a new UI paradigm.
- Open question: how a member flags a tag as wrong on a given item, and
  whether that just hides the one association or also shapes future
  tagging.
