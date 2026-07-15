"use server";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Enter your email address." };
  }

  const supabase = await createClient();

  await supabase.auth.signInWithOtp({
    email,
    options: {
      // Invite-only: never create a new account from the login form.
      shouldCreateUser: false,
      // No emailRedirectTo: the custom magic-link template (see
      // supabase/templates/magic-link.html) points at /auth/confirm
      // directly via token_hash, not Supabase's ConfirmationURL.
    },
  });

  // Same response regardless of whether the address has an account, so the
  // form can't be used to enumerate invited members.
  return {
    status: "sent",
    message: `If ${email} is an invited member, a sign-in link is on its way.`,
  };
}
