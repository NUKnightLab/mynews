"use client";

import { useActionState } from "react";
import { updateDisplayName, type UpdateDisplayNameState } from "./actions";

const initialState: UpdateDisplayNameState = { status: "idle" };

export function DisplayNameForm({ initialValue }: { initialValue: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            maxLength={60}
            defaultValue={initialValue}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p className={`text-sm ${state.status === "error" ? "text-red-600" : "text-green-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
