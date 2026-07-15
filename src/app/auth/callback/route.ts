import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase's default (unmodified, free-tier) email templates send a
// ConfirmationURL that redirects here with a PKCE `code` param after
// verifying the invite/magic-link token itself.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).single()
        : { data: null };

      return NextResponse.redirect(
        `${origin}${profile?.role === "admin" ? "/admin" : "/feed"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
