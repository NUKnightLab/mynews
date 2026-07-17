import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type WeightsRow = Database["public"]["Tables"]["member_weights"]["Row"];

// All four global dials from member_weights. The reading view's per-item
// nudge (item-card.tsx) intentionally only offers "recency" | "corroboration"
// | "popularity" - sourceDiversity is a list-level interleaving effect, not
// something that makes sense to target from one item's "why am I seeing
// this." The settings page (all four) is the only place it's adjustable.
export type WeightFactor = "recency" | "sourceDiversity" | "corroboration" | "popularity";

export const NUDGE_INCREMENT = 0.15;

const WEIGHT_MIN = 0;
const WEIGHT_MAX = 2;
const AFFINITY_MIN = -1;
const AFFINITY_MAX = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Supabase's typed .update()/.select() reject a computed `[column]: value`
// key (it wants a literal object shape), so map explicitly instead of
// building the patch dynamically from WEIGHT_COLUMN.
export async function setWeight(
  client: Client,
  profileId: string,
  factor: WeightFactor,
  value: number,
) {
  const clamped = clamp(value, WEIGHT_MIN, WEIGHT_MAX);
  const updated_at = new Date().toISOString();
  const patch: Partial<WeightsRow> =
    factor === "recency"
      ? { recency: clamped, updated_at }
      : factor === "sourceDiversity"
        ? { source_diversity: clamped, updated_at }
        : factor === "corroboration"
          ? { corroboration: clamped, updated_at }
          : { popularity: clamped, updated_at };

  await client.from("member_weights").update(patch).eq("profile_id", profileId);
}

export async function nudgeWeight(
  client: Client,
  profileId: string,
  factor: WeightFactor,
  delta: number,
) {
  const { data } = await client
    .from("member_weights")
    .select("recency, source_diversity, corroboration, popularity")
    .eq("profile_id", profileId)
    .single();

  const current =
    factor === "recency"
      ? (data?.recency ?? 1)
      : factor === "sourceDiversity"
        ? (data?.source_diversity ?? 1)
        : factor === "corroboration"
          ? (data?.corroboration ?? 1)
          : (data?.popularity ?? 1);

  await setWeight(client, profileId, factor, current + delta);
}

export async function setAffinity(
  client: Client,
  profileId: string,
  sourceId: string,
  value: number,
) {
  await client.from("member_source_affinity").upsert(
    {
      profile_id: profileId,
      source_id: sourceId,
      affinity: clamp(value, AFFINITY_MIN, AFFINITY_MAX),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,source_id" },
  );
}

export async function nudgeAffinity(
  client: Client,
  profileId: string,
  sourceId: string,
  delta: number,
) {
  const { data } = await client
    .from("member_source_affinity")
    .select("affinity")
    .eq("profile_id", profileId)
    .eq("source_id", sourceId)
    .maybeSingle();
  const current = data?.affinity ?? 0;
  await setAffinity(client, profileId, sourceId, current + delta);
}

export async function setTagWeight(
  client: Client,
  profileId: string,
  tag: string,
  value: number,
) {
  await client.from("member_tag_weights").upsert(
    {
      profile_id: profileId,
      tag,
      weight: clamp(value, AFFINITY_MIN, AFFINITY_MAX),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,tag" },
  );
}

export async function nudgeTagWeight(
  client: Client,
  profileId: string,
  tag: string,
  delta: number,
) {
  const { data } = await client
    .from("member_tag_weights")
    .select("weight")
    .eq("profile_id", profileId)
    .eq("tag", tag)
    .maybeSingle();
  const current = data?.weight ?? 0;
  await setTagWeight(client, profileId, tag, current + delta);
}
