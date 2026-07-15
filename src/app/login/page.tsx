"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-gray-500">
          Invite-only. Enter the email address you were invited with and
          we&apos;ll send you a sign-in link.
        </p>
        <form action={formAction} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send sign-in link"}
          </button>
        </form>
        {state.status !== "idle" && (
          <p
            className={`text-sm ${state.status === "error" ? "text-red-600" : "text-green-700"}`}
          >
            {state.message}
          </p>
        )}
      </div>
    </main>
  );
}
