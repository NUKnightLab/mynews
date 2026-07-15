import Parser from "rss-parser";

const parser = new Parser({ timeout: 10_000 });

export type ParsedFeed = {
  title: string | null;
  siteUrl: string | null;
};

// Shared by the add-feed validation flow (Phase 2) and the polling job
// (Phase 3), so both agree on what counts as a valid feed.
export async function parseFeedUrl(url: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(url);
  return {
    title: feed.title?.trim() || null,
    siteUrl: feed.link?.trim() || null,
  };
}
