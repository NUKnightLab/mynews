"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "./actions";

const initialState: InviteState = { status: "idle" };

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        name="displayName"
        placeholder="Display name (optional)"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <select
        name="role"
        defaultValue="member"
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Sending invite..." : "Send invite"}
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
