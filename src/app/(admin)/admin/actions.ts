"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";

export type InviteState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function inviteMember(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const requester = await getCurrentProfile();
  if (!requester || requester.role !== "admin") {
    return { status: "error", message: "Not authorized." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "member";

  if (!email) {
    return { status: "error", message: "Enter an email address." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    // No redirectTo: the custom invite template (see
    // supabase/templates/invite.html) points at /auth/confirm directly
    // via token_hash, not Supabase's ConfirmationURL.
    data: {
      role,
      group_id: requester.group_id,
      ...(displayName ? { display_name: displayName } : {}),
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin");
  return { status: "sent", message: `Invited ${email}.` };
}
