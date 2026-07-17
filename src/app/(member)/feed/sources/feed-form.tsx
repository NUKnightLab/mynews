"use client";

import { useActionState, useRef, useEffect } from "react";
import { addFeed, type AddFeedState } from "./actions";

const initialState: AddFeedState = { status: "idle" };

export function FeedForm() {
  const [state, formAction, pending] = useActionState(addFeed, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex max-w-sm flex-col gap-3"
    >
      <input
        // Not type="url": that enforces a scheme via native browser
        // validation, which would block a bare domain like "example.com"
        // before it ever reaches addFeed's own scheme-fallback handling.
        type="text"
        name="url"
        required
        placeholder="example.com/feed.xml"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Adding feed..." : "Add feed"}
      </button>
      {state.status !== "idle" && (
        <p
          className={`text-sm ${state.status === "error" ? "text-red-600" : "text-green-700"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
