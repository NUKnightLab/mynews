"use client";

import { adjustReason } from "./actions";

// Sits immediately to the left of the reason/source label it acts on (not
// flush right on the row) - the spatial closeness is what makes "which
// reason does this affect" obvious at a glance.
export function MoreLessButtons({
  factor,
  label,
  sourceId,
}: {
  factor: string;
  label: string;
  sourceId: string;
}) {
  return (
    <span className="flex shrink-0 gap-1">
      <form action={adjustReason}>
        <input type="hidden" name="factor" value={factor} />
        <input type="hidden" name="direction" value="more" />
        <input type="hidden" name="sourceId" value={sourceId} />
        <button
          type="submit"
          aria-label={`More like this: ${label}`}
          className="rounded border border-gray-300 px-1.5 leading-none"
        >
          +
        </button>
      </form>
      <form action={adjustReason}>
        <input type="hidden" name="factor" value={factor} />
        <input type="hidden" name="direction" value="less" />
        <input type="hidden" name="sourceId" value={sourceId} />
        <button
          type="submit"
          aria-label={`Less like this: ${label}`}
          className="rounded border border-gray-300 px-1.5 leading-none"
        >
          &minus;
        </button>
      </form>
    </span>
  );
}
