import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export default async function MembersPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: directory } = await supabase.rpc("get_group_directory", {
    p_profile_id: profile.id,
  });
  const others = (directory ?? []).filter((m) => m.id !== profile.id);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-xl font-semibold">Other Members</h1>
        <p className="text-sm text-gray-500">
          See what someone else in your group is reading right now - a
          reminder of what&apos;s outside your own tuned feed. Their weights
          and subscriptions stay private; you only see their current ranked
          view.
        </p>
      </div>

      {others.length === 0 ? (
        <p className="text-sm text-gray-500">No other members in your group yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {others.map((member) => (
            <li key={member.id}>
              <Link href={`/members/${member.id}`} className="underline">
                {member.display_name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
