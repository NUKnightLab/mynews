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

  // Parse first, then dedupe on the *resolved* feed URL - not the raw
  // input - so a member pasting a site's homepage and another member
  // pasting that same site's direct feed URL both land on one source row
  // (see parseFeedUrl's autodiscovery fallback in src/lib/feeds/parse.ts).
  const parsed = await parseFeedUrl(url.toString()).catch(() => null);
  if (!parsed) {
    return {
      status: "error",
      message:
        "Couldn't find an RSS/Atom feed at that URL, or linked from it.",
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("url", parsed.feedUrl)
    .maybeSingle();

  let sourceId = existing?.id;

  if (!sourceId) {
    const { data: inserted, error: insertError } = await supabase
      .from("sources")
      .insert({ url: parsed.feedUrl, title: parsed.title, site_url: parsed.siteUrl })
      .select("id")
      .single();

    if (insertError) {
      // Someone else added this exact feed URL between our check and insert.
      if (insertError.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("sources")
          .select("id")
          .eq("url", parsed.feedUrl)
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
