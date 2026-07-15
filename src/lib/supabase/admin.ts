import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Service-role client for privileged, server-only operations (e.g. issuing
// member invites). Never import this from a Client Component — the
// "server-only" import above turns any accidental client-side use into a
// build error.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
