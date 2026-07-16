"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { setWeight, type WeightFactor } from "@/lib/ranking/weights";

const FACTORS: WeightFactor[] = ["recency", "sourceDiversity", "corroboration", "popularity"];

export type UpdateWeightsState = { status: "idle" | "success" | "error"; message?: string };

export async function updateWeights(
  _prevState: UpdateWeightsState,
  formData: FormData,
): Promise<UpdateWeightsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Not signed in." };

  const supabase = await createClient();

  await Promise.all(
    FACTORS.map((factor) => {
      const raw = formData.get(factor);
      return raw === null ? Promise.resolve() : setWeight(supabase, profile.id, factor, Number(raw));
    }),
  );

  revalidatePath("/feed");
  revalidatePath("/feed/settings");
  return { status: "success", message: "Saved." };
}
