// Pure ranking engine (DESIGN_BRIEF.md §4-5). No I/O here - everything
// needed is passed in, so this is trivially unit-testable and has no
// knowledge of Supabase, auth, or the rest of the app. The data-fetching
// wrapper lives in rank-for-member.ts.

export type ScoreFactor =
  | "recency"
  | "corroboration"
  | "popularity"
  | "source_affinity"
  | "source_diversity";

export type ScoreReason = {
  factor: ScoreFactor;
  contribution: number;
  label: string;
};

export type ScoredItem = {
  item: RankableItem;
  score: number;
  reasons: ScoreReason[];
};

export type MemberWeights = {
  recency: number;
  sourceDiversity: number;
  corroboration: number;
  popularity: number;
};

export type RankableItem = {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null;
  fetchedAt: string;
};

export type RankingContext = {
  now: Date;
  weights: MemberWeights;
  // sourceId -> affinity, from past more/less feedback (§5). Absent = 0.
  sourceAffinity: Record<string, number>;
  // sourceId -> count of *other* group members subscribed to that source
  // (§4's "popularity" proxy - see get_source_subscriber_counts()).
  subscriberCountBySource: Record<string, number>;
  // Other members in the group, for normalizing popularity into 0..1.
  groupMemberCount: number;
};

const RECENCY_HALF_LIFE_HOURS = 24;
const CORROBORATION_CAP = 3;
const DIVERSITY_PENALTY_UNIT = 0.15;

export function rankItems(items: RankableItem[], ctx: RankingContext): ScoredItem[] {
  const titleGroups = groupByNormalizedTitle(items);

  const scored = items.map((item) => scoreItem(item, ctx, titleGroups));

  return applyDiversityReranking(scored, ctx.weights.sourceDiversity);
}

function scoreItem(
  item: RankableItem,
  ctx: RankingContext,
  titleGroups: Map<string, RankableItem[]>,
): ScoredItem {
  const reasons: ScoreReason[] = [];
  let score = 0;

  const recency = recencyScore(item, ctx.now);
  const recencyContribution = ctx.weights.recency * recency;
  score += recencyContribution;
  if (recencyContribution > 0.05) {
    reasons.push({ factor: "recency", contribution: recencyContribution, label: "Recent" });
  }

  const otherMatches = (titleGroups.get(normalizeTitle(item.title))?.length ?? 1) - 1;
  const corroboration = Math.min(otherMatches, CORROBORATION_CAP) / CORROBORATION_CAP;
  const corroborationContribution = ctx.weights.corroboration * corroboration;
  score += corroborationContribution;
  if (otherMatches > 0) {
    reasons.push({
      factor: "corroboration",
      contribution: corroborationContribution,
      label: `Also in ${otherMatches} of your other feed${otherMatches === 1 ? "" : "s"}`,
    });
  }

  const subscriberCount = ctx.subscriberCountBySource[item.sourceId] ?? 0;
  const popularity = ctx.groupMemberCount > 0 ? subscriberCount / ctx.groupMemberCount : 0;
  const popularityContribution = ctx.weights.popularity * popularity;
  score += popularityContribution;
  if (subscriberCount > 0) {
    reasons.push({
      factor: "popularity",
      contribution: popularityContribution,
      label: `${subscriberCount} other member${subscriberCount === 1 ? "" : "s"} in your group also get this source`,
    });
  }

  const affinity = ctx.sourceAffinity[item.sourceId] ?? 0;
  if (affinity !== 0) {
    score += affinity;
    reasons.push({
      factor: "source_affinity",
      contribution: affinity,
      label:
        affinity > 0
          ? "You've asked for more from this source"
          : "You've asked for less from this source",
    });
  }

  return { item, score, reasons };
}

// Greedy re-ranking pass: repeatedly pick the highest-scoring remaining
// item, but discount items from a source in proportion to how many times
// that source has already been picked (scaled by the member's
// source_diversity weight). At weight 0, this is a no-op and the list
// stays in pure score order.
function applyDiversityReranking(
  scored: ScoredItem[],
  diversityWeight: number,
): ScoredItem[] {
  const remaining = [...scored].sort((a, b) => b.score - a.score);
  const output: ScoredItem[] = [];
  const sourceCounts = new Map<string, number>();

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const priorCount = sourceCounts.get(remaining[i].item.sourceId) ?? 0;
      const adjusted = remaining[i].score - diversityWeight * DIVERSITY_PENALTY_UNIT * priorCount;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = i;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    const priorCount = sourceCounts.get(picked.item.sourceId) ?? 0;
    sourceCounts.set(picked.item.sourceId, priorCount + 1);

    if (priorCount > 0 && diversityWeight > 0) {
      picked.reasons.push({
        factor: "source_diversity",
        contribution: -(diversityWeight * DIVERSITY_PENALTY_UNIT * priorCount),
        label: "Spaced out to keep your feed varied",
      });
    }

    output.push(picked);
  }

  return output;
}

function recencyScore(item: RankableItem, now: Date): number {
  const publishedAt = item.publishedAt ?? item.fetchedAt;
  const ageHours = Math.max(0, (now.getTime() - new Date(publishedAt).getTime()) / 3_600_000);
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function groupByNormalizedTitle(items: RankableItem[]): Map<string, RankableItem[]> {
  const map = new Map<string, RankableItem[]>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}
