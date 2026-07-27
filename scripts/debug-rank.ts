// Dev utility for iterating on the ranking engine without a browser.
// Usage: node --env-file=.env.local --import tsx scripts/debug-rank.ts <email>
//
// Mints a real session for the given (already-invited) member via the
// admin API + verifyOtp - the same mechanism src/app/auth/confirm/actions.ts
// uses for a real sign-in - so RLS and the security-definer RPCs (group
// directory, subscriber counts) see a real auth.uid(), not a service-role
// bypass.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { rankForMember } from "../src/lib/ranking/rank-for-member";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node --env-file=.env.local --import tsx scripts/debug-rank.ts <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createSupabaseClient<Database>(url, serviceKey);
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData) throw linkError ?? new Error("generateLink returned no data");

  const anon = createSupabaseClient<Database>(url, anonKey);
  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (verifyError || !verifyData.session || !verifyData.user) {
    throw verifyError ?? new Error("verifyOtp returned no session");
  }

  const userClient = createSupabaseClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${verifyData.session.access_token}` } },
  });

  const { data: profile } = await userClient
    .from("profiles")
    .select("id, display_name")
    .eq("id", verifyData.user.id)
    .single();
  if (!profile) throw new Error(`No profile for ${email}`);

  const ranked = await rankForMember(userClient, profile.id);

  console.log(`Ranked feed for ${profile.display_name} (${ranked.length} items):\n`);
  for (const { item, score, effectiveScore, reasons } of ranked) {
    const effective = Math.abs(effectiveScore - score) > 0.005 ? ` (eff ${effectiveScore.toFixed(2)})` : "";
    console.log(`[${score.toFixed(2)}${effective}] ${item.title}`);
    for (const reason of reasons) {
      const sign = reason.contribution >= 0 ? "+" : "";
      console.log(`    ${reason.factor}: ${sign}${reason.contribution.toFixed(2)} - ${reason.label}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
