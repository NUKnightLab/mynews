"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  nudgeWeight,
  nudgeAffinity,
  nudgeTagWeight,
  NUDGE_INCREMENT,
  type WeightFactor,
} from "@/lib/ranking/weights";
import { pollSources, isEligibleForManualPoll } from "@/lib/feeds/poll";

const WEIGHT_FACTORS: WeightFactor[] = ["recency", "corroboration", "popularity"];

// Bounds worst-case latency/outbound-connection count for a single
// manual refresh, independent of the per-source cooldown below.
const MAX_MANUAL_REFRESH_SOURCES = 20;

// Backs the reason-specific more/less controls (DESIGN_BRIEF.md §5): each
// click targets exactly one named factor, using the same mutation the
// settings sliders use - so implicit feedback and explicit adjustment are
// provably the same mechanism, not two different systems.
export async function adjustReason(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const factor = String(formData.get("factor") ?? "");
  const direction = formData.get("direction") === "less" ? -1 : 1;
  const sourceId = String(formData.get("sourceId") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const delta = direction * NUDGE_INCREMENT;

  const supabase = await createClient();

  if (WEIGHT_FACTORS.includes(factor as WeightFactor)) {
    await nudgeWeight(supabase, profile.id, factor as WeightFactor, delta);
  } else if (factor === "source_affinity" && sourceId) {
    await nudgeAffinity(supabase, profile.id, sourceId, delta);
  } else if (factor === "tag_affinity" && tag) {
    await nudgeTagWeight(supabase, profile.id, tag, delta);
  }

  revalidatePath("/feed");
  revalidatePath("/feed/settings");
}

export type RefreshState = { status: "idle" | "success" | "error"; message?: string };

// Lets a member force-refresh their own feed instead of waiting for the
// next cron run - scoped to *their* subscriptions only (not every source
// in the system), and gated by the same per-source cooldown the
// add-feed auto-poll uses (see src/lib/feeds/poll.ts), so repeated
// clicks - by this member or anyone else subscribed to the same
// source - can't hammer an external feed server.
export async function refreshMySources(
  _prevState: RefreshState,
  _formData: FormData,
): Promise<RefreshState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Not signed in." };

  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("member_subscriptions")
    .select("source:sources(id, last_polled_at)")
    .eq("profile_id", profile.id);

  const eligibleIds = (subscriptions ?? [])
    .map((s) => s.source)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .filter((s) => isEligibleForManualPoll(s.last_polled_at))
    .slice(0, MAX_MANUAL_REFRESH_SOURCES)
    .map((s) => s.id);

  if (eligibleIds.length === 0) {
    return {
      status: "success",
      message: "Everything was refreshed recently - try again in a few minutes.",
    };
  }

  const results = await pollSources(eligibleIds);
  const succeeded = results.filter((r) => r.ok).length;

  revalidatePath("/feed");
  return {
    status: "success",
    message: `Refreshed ${succeeded} of ${results.length} feed${results.length === 1 ? "" : "s"}.`,
  };
}
