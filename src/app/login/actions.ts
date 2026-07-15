"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/site-url";

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
  const origin = await getOrigin();

  await supabase.auth.signInWithOtp({
    email,
    options: {
      // Invite-only: never create a new account from the login form.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  // Same response regardless of whether the address has an account, so the
  // form can't be used to enumerate invited members.
  return {
    status: "sent",
    message: `If ${email} is an invited member, a sign-in link is on its way.`,
  };
}
