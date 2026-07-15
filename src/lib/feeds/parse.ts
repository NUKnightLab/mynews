import Parser from "rss-parser";

const parser = new Parser({ timeout: 10_000 });

// Used by the poller (Phase 3), which already has canonical feed URLs
// from `sources.url` and needs the full item list, not just title/siteUrl.
export async function fetchFeed(url: string) {
  return parser.parseURL(url);
}

export type ParsedFeed = {
  title: string | null;
  siteUrl: string | null;
  // The actual machine-readable feed URL - may differ from the URL passed
  // in if that URL was an HTML page with an autodiscovery <link> tag
  // rather than the feed itself (e.g. a blog homepage).
  feedUrl: string;
};

// Shared by the add-feed validation flow (Phase 2) and the polling job
// (Phase 3), so both agree on what counts as a valid feed. Falls back to
// RSS/Atom autodiscovery (a <link rel="alternate" type="application/
// {rss,atom}+xml"> tag) when the given URL is an HTML page rather than a
// feed itself, so members can paste a site's homepage URL.
export async function parseFeedUrl(url: string): Promise<ParsedFeed> {
  const direct = await tryParseAsFeed(url);
  if (direct) return direct;

  const discoveredUrl = await discoverFeedUrl(url);
  if (discoveredUrl) {
    const viaDiscovery = await tryParseAsFeed(discoveredUrl);
    if (viaDiscovery) return viaDiscovery;
  }

  throw new Error(`No RSS/Atom feed found at or linked from ${url}`);
}

async function tryParseAsFeed(url: string): Promise<ParsedFeed | null> {
  try {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title?.trim() || null,
      siteUrl: feed.link?.trim() || null,
      feedUrl: url,
    };
  } catch {
    return null;
  }
}

async function discoverFeedUrl(pageUrl: string): Promise<string | null> {
  let html: string;
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSFilterBot/1.0)" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("html")) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const feedTypes = ["application/rss+xml", "application/atom+xml"];
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];

  for (const tag of linkTags) {
    const rel = extractAttr(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    const type = extractAttr(tag, "type")?.toLowerCase();
    const href = extractAttr(tag, "href");

    if (rel.includes("alternate") && type && feedTypes.includes(type) && href) {
      try {
        return new URL(href, pageUrl).toString();
      } catch {
        continue;
      }
    }
  }

  return null;
}

function extractAttr(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match ? match[1] : null;
}
