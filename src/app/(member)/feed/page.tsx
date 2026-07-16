import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { rankForMember } from "@/lib/ranking/rank-for-member";
import { ItemCard } from "./item-card";

export default async function FeedPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const ranked = await rankForMember(supabase, profile.id);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-xl font-semibold">Your Feed</h1>
        <p className="text-sm text-gray-500">
          Ranked from your subscribed sources. Expand &ldquo;why am I seeing
          this&rdquo; on any item to see more or less of a specific reason.
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-gray-500">
          No items yet - add feeds on the Sources page, then check back
          after the next poll.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {ranked.map((scored) => (
            <ItemCard key={scored.item.id} scored={scored} />
          ))}
        </ul>
      )}
    </main>
  );
}
