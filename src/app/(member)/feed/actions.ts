"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { nudgeWeight, nudgeAffinity, NUDGE_INCREMENT, type WeightFactor } from "@/lib/ranking/weights";

const WEIGHT_FACTORS: WeightFactor[] = ["recency", "corroboration", "popularity"];

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
  const delta = direction * NUDGE_INCREMENT;

  const supabase = await createClient();

  if (WEIGHT_FACTORS.includes(factor as WeightFactor)) {
    await nudgeWeight(supabase, profile.id, factor as WeightFactor, delta);
  } else if (factor === "source_affinity" && sourceId) {
    await nudgeAffinity(supabase, profile.id, sourceId, delta);
  }

  revalidatePath("/feed");
}
