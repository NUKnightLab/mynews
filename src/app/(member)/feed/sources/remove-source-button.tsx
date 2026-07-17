"use client";

import { useState } from "react";
import { removeFeed } from "./actions";

// Two clicks required: first swaps to a Confirm/Cancel pair, second
// actually submits. Removing a source is easy to fat-finger otherwise -
// it's a one-way action (re-adding means re-discovering the feed URL).
export function RemoveSourceButton({ subscriptionId }: { subscriptionId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Remove source"
        title="Remove source"
        className="shrink-0 text-lg leading-none text-red-600 hover:text-red-800"
      >
        &times;
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1 text-xs">
      <form action={removeFeed}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <button
          type="submit"
          className="rounded bg-red-600 px-1.5 py-0.5 font-medium text-white"
        >
          Confirm
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-gray-500 underline"
      >
        Cancel
      </button>
    </span>
  );
}
