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

export type UpdateDisplayNameState = { status: "idle" | "success" | "error"; message?: string };

// Studio-issued invites (e.g. bootstrapping the first local/prod admin -
// see README.md "Signing in locally") don't go through our own invite
// form, so they never get a chance to set a display name - the trigger
// falls back to the email's local-part (see handle_new_user() in
// 20260714000001_init_roster.sql). This is the fix for that: shown to
// other members (cross-member view, roster, directory), so it needs to
// be self-service, not something only an admin can change.
export async function updateDisplayName(
  _prevState: UpdateDisplayNameState,
  formData: FormData,
): Promise<UpdateDisplayNameState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Not signed in." };

  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  if (!displayName) {
    return { status: "error", message: "Display name can't be empty." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", profile.id);

  if (error) {
    return { status: "error", message: "Couldn't save. Try again." };
  }

  // Shown in both area headers, the admin roster, and the member directory.
  revalidatePath("/feed");
  revalidatePath("/feed/settings");
  revalidatePath("/admin");
  revalidatePath("/members");
  return { status: "success", message: "Saved." };
}
