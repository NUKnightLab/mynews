"use client";

import { adjustReason } from "./actions";

// Borderless up/down arrows, meant to sit immediately to the left of the
// reason/source label they act on (not flush right on the row) - the
// spatial closeness is what makes "which reason does this affect" obvious
// at a glance.
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
    <span className="flex shrink-0 flex-col leading-none text-gray-400">
      <form action={adjustReason}>
        <input type="hidden" name="factor" value={factor} />
        <input type="hidden" name="direction" value="more" />
        <input type="hidden" name="sourceId" value={sourceId} />
        <button type="submit" aria-label={`More like this: ${label}`} className="block hover:text-black">
          &#9650;
        </button>
      </form>
      <form action={adjustReason}>
        <input type="hidden" name="factor" value={factor} />
        <input type="hidden" name="direction" value="less" />
        <input type="hidden" name="sourceId" value={sourceId} />
        <button type="submit" aria-label={`Less like this: ${label}`} className="block hover:text-black">
          &#9660;
        </button>
      </form>
    </span>
  );
}
