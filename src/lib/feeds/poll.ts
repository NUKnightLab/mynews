import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFeed } from "@/lib/feeds/parse";
import type { Database } from "@/lib/supabase/database.types";

type Source = Database["public"]["Tables"]["sources"]["Row"];
type AdminClient = ReturnType<typeof createAdminClient>;

export type PollResult = {
  sourceId: string;
  url: string;
  ok: boolean;
  itemCount?: number;
  error?: string;
};

export async function pollAllSources(): Promise<PollResult[]> {
  const admin = createAdminClient();
  const { data: sources } = await admin.from("sources").select("id");
  if (!sources) return [];
  return pollSources(sources.map((s) => s.id));
}

// Polls a specific subset of sources in parallel (not sequentially - a
// member's manual refresh shouldn't wait on N feeds one at a time, and
// each fetch already has its own timeout via fetchFeed). Used by both the
// cron job (pollAllSources, above) and member-triggered refreshes
// (see src/app/(member)/feed/actions.ts).
export async function pollSources(sourceIds: string[]): Promise<PollResult[]> {
  if (sourceIds.length === 0) return [];
  const admin = createAdminClient();
  const { data: sources } = await admin.from("sources").select("*").in("id", sourceIds);
  if (!sources) return [];
  return Promise.all(sources.map((source) => pollSource(admin, source)));
}

const MANUAL_POLL_COOLDOWN_MINUTES = 3;

// Shared abuse guard for anything that lets a member trigger a poll
// on-demand (manual refresh, auto-poll-on-add): skip sources polled too
// recently, regardless of who's asking or how many times. Cheap and
// reuses a column we already have - no new schema, no per-member
// counters, and it protects the external feed server (the thing actually
// at risk from repeated hammering) rather than just rate-limiting our
// own endpoint.
export function isEligibleForManualPoll(lastPolledAt: string | null): boolean {
  if (!lastPolledAt) return true;
  const elapsedMs = Date.now() - new Date(lastPolledAt).getTime();
  return elapsedMs >= MANUAL_POLL_COOLDOWN_MINUTES * 60_000;
}

async function pollSource(admin: AdminClient, source: Source): Promise<PollResult> {
  try {
    const feed = await fetchFeed(source.url);

    const rows = (feed.items ?? [])
      .filter((item): item is typeof item & { link: string } => Boolean(item.link))
      .map((item) => ({
        source_id: source.id,
        url: item.link,
        title: item.title?.trim() || item.link,
        summary: item.contentSnippet?.trim() || null,
        author: item.creator?.trim() || item.author?.trim() || null,
        published_at: item.isoDate ?? toIsoOrNull(item.pubDate),
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("items")
        .upsert(rows, { onConflict: "source_id,url" });
      if (upsertError) throw upsertError;
    }

    await admin
      .from("sources")
      .update({ last_polled_at: new Date().toISOString(), last_poll_error: null })
      .eq("id", source.id);

    return { sourceId: source.id, url: source.url, ok: true, itemCount: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await admin
      .from("sources")
      .update({ last_polled_at: new Date().toISOString(), last_poll_error: message })
      .eq("id", source.id);
    return { sourceId: source.id, url: source.url, ok: false, error: message };
  }
}

function toIsoOrNull(dateString: string | undefined): string | null {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const DEFAULT_PRUNE_AFTER_DAYS = 180;

export async function pruneOldItems(): Promise<{ deleted: number }> {
  const days = Number(process.env.PRUNE_ITEMS_AFTER_DAYS) || DEFAULT_PRUNE_AFTER_DAYS;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("items")
    .delete()
    .lt("fetched_at", cutoff)
    .select("id");

  if (error) throw error;
  return { deleted: data?.length ?? 0 };
}
