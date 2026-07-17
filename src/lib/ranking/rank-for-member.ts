import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { rankItems, type MemberWeights, type RankableItem, type ScoredItem } from "./score";

const DEFAULT_WEIGHTS: MemberWeights = {
  recency: 1,
  sourceDiversity: 1,
  corroboration: 1,
  popularity: 1,
};

const MAX_ITEMS = 200;

// Takes the Supabase client as a parameter rather than constructing one
// itself, so this works both inside a Next.js request (pass the
// next/headers-bound server client) and standalone (e.g.
// scripts/debug-rank.ts, tests) - see that script for how to build a
// client with a real user session outside a request context.
export async function rankForMember(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<ScoredItem[]> {
  const [
    { data: subscriptions },
    { data: weightsRow },
    { data: affinityRows },
    { data: directory },
    { data: sourceTagRows },
    { data: tagWeightRows },
  ] = await Promise.all([
    supabase.from("member_subscriptions").select("source_id").eq("profile_id", profileId),
    supabase.from("member_weights").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("member_source_affinity").select("source_id, affinity").eq("profile_id", profileId),
    supabase.rpc("get_group_directory", { p_profile_id: profileId }),
    supabase.from("member_source_tags").select("source_id, tag").eq("profile_id", profileId),
    supabase.from("member_tag_weights").select("tag, weight").eq("profile_id", profileId),
  ]);

  const sourceIds = (subscriptions ?? []).map((s) => s.source_id);
  if (sourceIds.length === 0) return [];

  const { data: itemRows } = await supabase
    .from("items")
    .select("id, source_id, url, title, summary, author, published_at, fetched_at, source:sources(title)")
    .in("source_id", sourceIds)
    .order("published_at", { ascending: false })
    .limit(MAX_ITEMS);

  const items: RankableItem[] = (itemRows ?? []).map((row) => ({
    id: row.id,
    sourceId: row.source_id,
    sourceTitle: row.source?.title ?? null,
    url: row.url,
    title: row.title,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
  }));

  const weights: MemberWeights = weightsRow
    ? {
        recency: weightsRow.recency,
        sourceDiversity: weightsRow.source_diversity,
        corroboration: weightsRow.corroboration,
        popularity: weightsRow.popularity,
      }
    : DEFAULT_WEIGHTS;

  const sourceAffinity = Object.fromEntries(
    (affinityRows ?? []).map((row) => [row.source_id, row.affinity]),
  );

  const { data: subscriberCounts } = await supabase.rpc("get_source_subscriber_counts", {
    p_profile_id: profileId,
  });
  const subscriberCountBySource = Object.fromEntries(
    (subscriberCounts ?? []).map((row) => [row.source_id, Number(row.subscriber_count)]),
  );

  // "Other members" = the group directory minus me.
  const groupMemberCount = Math.max(0, (directory?.length ?? 1) - 1);

  const sourceTags: Record<string, string[]> = {};
  for (const row of sourceTagRows ?? []) {
    (sourceTags[row.source_id] ??= []).push(row.tag);
  }

  const tagAffinity = Object.fromEntries((tagWeightRows ?? []).map((row) => [row.tag, row.weight]));

  return rankItems(items, {
    now: new Date(),
    weights,
    sourceAffinity,
    subscriberCountBySource,
    groupMemberCount,
    sourceTags,
    tagAffinity,
  });
}
