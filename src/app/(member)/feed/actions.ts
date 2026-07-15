"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseFeedUrl } from "@/lib/feeds/parse";

export type AddFeedState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addFeed(
  _prevState: AddFeedState,
  formData: FormData,
): Promise<AddFeedState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Not signed in." };

  const rawUrl = String(formData.get("url") ?? "").trim();
  if (!rawUrl) return { status: "error", message: "Enter a feed URL." };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { status: "error", message: "That doesn't look like a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { status: "error", message: "Feed URL must be http or https." };
  }

  const supabase = await createClient();

  // Reuse an existing source row if this URL is already known (see
  // supabase/migrations/20260715000001_feeds.sql for why sources are
  // shared/deduped across members).
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("url", url.toString())
    .maybeSingle();

  let sourceId = existing?.id;

  if (!sourceId) {
    const parsed = await parseFeedUrl(url.toString()).catch(() => null);
    if (!parsed) {
      return {
        status: "error",
        message:
          "Couldn't read that as an RSS/Atom feed. Check the URL and try again.",
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("sources")
      .insert({ url: url.toString(), title: parsed.title, site_url: parsed.siteUrl })
      .select("id")
      .single();

    if (insertError) {
      // Someone else added this exact URL between our check and insert.
      if (insertError.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("sources")
          .select("id")
          .eq("url", url.toString())
          .single();
        sourceId = raceWinner?.id;
      }
      if (!sourceId) {
        return { status: "error", message: "Couldn't save that feed. Try again." };
      }
    } else {
      sourceId = inserted.id;
    }
  }

  const { error: subError } = await supabase
    .from("member_subscriptions")
    .insert({ profile_id: profile.id, source_id: sourceId });

  if (subError) {
    if (subError.code === "23505") {
      return { status: "error", message: "You're already subscribed to that feed." };
    }
    return { status: "error", message: "Couldn't subscribe. Try again." };
  }

  revalidatePath("/feed");
  return { status: "success", message: "Feed added." };
}

export async function removeFeed(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  if (!subscriptionId) return;

  const supabase = await createClient();
  await supabase
    .from("member_subscriptions")
    .delete()
    .eq("id", subscriptionId)
    .eq("profile_id", profile.id);

  revalidatePath("/feed");
}
