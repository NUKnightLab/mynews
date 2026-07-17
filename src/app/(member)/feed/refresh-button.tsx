"use client";

import { useActionState } from "react";
import { refreshMySources, type RefreshState } from "./actions";

const initialState: RefreshState = { status: "idle" };

export function RefreshButton() {
  const [state, formAction, pending] = useActionState(refreshMySources, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "Refresh now"}
      </button>
      {state.status !== "idle" && (
        <span className="text-xs text-gray-500">{state.message}</span>
      )}
    </form>
  );
}
