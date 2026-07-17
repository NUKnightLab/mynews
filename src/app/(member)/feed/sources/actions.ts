"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseFeedUrl } from "@/lib/feeds/parse";
import { pollSources, isEligibleForManualPoll } from "@/lib/feeds/poll";

export type AddFeedState = {
  status: "idle" | "success" | "error";
  message?: string;
};

// Accepts a bare domain ("example.com") or domain+path
// ("example.com/feed") with no scheme - tries the raw input first (so a
// correctly-typed "https://..." URL is untouched), then retries once with
// "https://" prepended. A bare domain fails `new URL()` outright; a
// string like "example.com:8080" actually parses but with a bogus
// "example.com:" protocol, which the http/https check below also sends
// through the fallback.
function parseUrlWithFallback(rawUrl: string): URL | null {
  for (const candidate of [rawUrl, `https://${rawUrl}`]) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export async function addFeed(
  _prevState: AddFeedState,
  formData: FormData,
): Promise<AddFeedState> {
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", message: "Not signed in." };

  const rawUrl = String(formData.get("url") ?? "").trim();
  if (!rawUrl) return { status: "error", message: "Enter a feed URL." };

  const url = parseUrlWithFallback(rawUrl);
  if (!url) {
    return { status: "error", message: "That doesn't look like a valid URL." };
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
    .select("id, last_polled_at")
    .eq("url", parsed.feedUrl)
    .maybeSingle();

  let sourceId = existing?.id;
  let lastPolledAt = existing?.last_polled_at ?? null;

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
          .select("id, last_polled_at")
          .eq("url", parsed.feedUrl)
          .single();
        sourceId = raceWinner?.id;
        lastPolledAt = raceWinner?.last_polled_at ?? null;
      }
      if (!sourceId) {
        return { status: "error", message: "Couldn't save that feed. Try again." };
      }
    } else {
      sourceId = inserted.id;
      lastPolledAt = null; // brand new - never polled
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

  // Best-effort: fetch content right away so a new subscriber doesn't
  // stare at an empty feed until the next cron run (see
  // src/lib/feeds/poll.ts for the shared cooldown that keeps this from
  // hammering a source that multiple members happen to add at once).
  // Never fails the add itself - poll failures are visible on the
  // source's last_poll_error instead.
  if (isEligibleForManualPoll(lastPolledAt)) {
    await pollSources([sourceId]).catch(() => {});
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

// Tags are personal (like weights/affinity - see DESIGN_BRIEF.md §3),
// normalized to lowercase/trimmed so "Climate" and "climate" don't
// fragment into two separate tags in the ranking engine.
export async function addSourceTag(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const sourceId = String(formData.get("sourceId") ?? "");
  const tag = String(formData.get("tag") ?? "").trim().toLowerCase().slice(0, 40);
  if (!sourceId || !tag) return;

  const supabase = await createClient();
  // Already tagged (unique violation) is a no-op, not an error.
  await supabase.from("member_source_tags").insert({ profile_id: profile.id, source_id: sourceId, tag });

  revalidatePath("/feed/sources");
  revalidatePath("/feed");
}

export async function removeSourceTag(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const tagId = String(formData.get("tagId") ?? "");
  if (!tagId) return;

  const supabase = await createClient();
  await supabase.from("member_source_tags").delete().eq("id", tagId).eq("profile_id", profile.id);

  revalidatePath("/feed/sources");
  revalidatePath("/feed");
}
