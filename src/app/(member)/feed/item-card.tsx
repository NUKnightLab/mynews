"use client";

import { useState } from "react";
import type { ScoredItem, ScoreReason } from "@/lib/ranking/score";
import { MoreLessButtons } from "./more-less-buttons";

// source_diversity deliberately excluded - see src/lib/ranking/weights.ts.
const ACTIONABLE_FACTORS = new Set([
  "recency",
  "corroboration",
  "popularity",
  "source_affinity",
  "tag_affinity",
]);

export function ItemCard({ scored }: { scored: ScoredItem }) {
  const [expanded, setExpanded] = useState(false);
  const { item, reasons } = scored;

  // The source row is always shown (below), so pull it out of the mapped
  // reasons - otherwise a member has no way to make the *first* "more from
  // this source" click, since the engine only emits a source_affinity
  // reason once affinity is already non-zero.
  const sourceReason = reasons.find((r) => r.factor === "source_affinity");
  const otherReasons: ScoreReason[] = reasons.filter((r) => r.factor !== "source_affinity");
  const sourceLabel = item.sourceTitle ?? "this source";

  return (
    <li className="flex flex-col gap-1 border-b border-gray-100 pb-4">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
      >
        {item.title}
      </a>
      <div className="text-xs text-gray-500">
        {item.sourceTitle ?? "Unknown source"}
        {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleString()}` : ""}
      </div>
      {item.summary && (
        <p className="line-clamp-2 text-sm text-gray-700">{item.summary}</p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-1 self-start text-xs text-gray-500 underline"
      >
        {expanded ? "Hide why you're seeing this" : "Why am I seeing this?"}
      </button>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-2 rounded border border-gray-200 p-3 text-xs">
          {otherReasons.map((reason) => (
            <li key={reason.tag ?? reason.factor} className="flex items-center gap-2">
              {ACTIONABLE_FACTORS.has(reason.factor) && (
                <MoreLessButtons
                  factor={reason.factor}
                  label={reason.label}
                  sourceId={item.sourceId}
                  tag={reason.tag}
                />
              )}
              <span>{reason.label}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <MoreLessButtons
              factor="source_affinity"
              label={`from ${sourceLabel}`}
              sourceId={item.sourceId}
            />
            <span>{sourceReason?.label ?? `From ${sourceLabel}`}</span>
          </li>
        </ul>
      )}
    </li>
  );
}
