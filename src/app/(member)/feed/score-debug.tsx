// Temporary diagnostic UI for tuning the ranking/cap logic (see
// DESIGN_BRIEF.md §4 discussion of feed length). Everything here is a
// bare number, not user-facing copy, and it's all meant to come out (or
// move behind an admin-only toggle) once a cap strategy is settled -
// every element carries data-score-debug so `grep -rl data-score-debug
// src/app` finds every call site to rip out.

const BADGE_CLASS = "rounded px-1.5 py-0.5 font-mono text-xs bg-gray-100 text-gray-600";
const ORIGINAL_CLASS = "font-mono text-xs text-gray-500";
const CONTRIBUTION_CLASS = "ml-auto font-mono text-xs text-gray-500";

// score = sum of every factor's contribution. effectiveScore = score minus
// any source-diversity spacing penalty (score.ts's applyDiversityReranking)
// - it's what actually determined this item's position in the list, so it
// always renders in the same (badge) position/style. When diversity
// spacing changed it, the superseded raw score shows alongside in
// alternate (struck-through) styling rather than fighting for the same
// visual slot.
export function ScoreBadges({
  score,
  effectiveScore,
}: {
  score: number;
  effectiveScore: number;
}) {
  const wasAdjusted = Math.abs(effectiveScore - score) > 0.005;
  return (
    <span data-score-debug className="flex shrink-0 items-center gap-1">
      {wasAdjusted && (
        <span className={ORIGINAL_CLASS} title="Raw score before source-diversity spacing">
          ({score.toFixed(2)})
        </span>
      )}
      <span
        className={BADGE_CLASS}
        title={
          wasAdjusted
            ? "Effective score after source-diversity spacing - this determines list position"
            : "Score (sum of all factors)"
        }
      >
        {effectiveScore.toFixed(2)}
      </span>
    </span>
  );
}

export function ReasonContribution({ contribution }: { contribution: number }) {
  return (
    <span data-score-debug className={CONTRIBUTION_CLASS}>
      {contribution > 0 ? "+" : ""}
      {contribution.toFixed(2)}
    </span>
  );
}
