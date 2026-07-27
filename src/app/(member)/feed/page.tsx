import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { rankForMember } from "@/lib/ranking/rank-for-member";
import { ItemCard } from "./item-card";
import { RefreshButton } from "./refresh-button";

export default async function FeedPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const ranked = await rankForMember(supabase, profile.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Feed</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {`Ranked from your subscribed sources, showing the top ${ranked.length} by score.`}{" "}
            Expand &ldquo;why am I seeing this&rdquo; on any item to see
            more or less of a specific reason.
          </p>
        </div>
        <RefreshButton />
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-gray-500">
          No items yet - add feeds on the Sources page, then check back
          after the next poll.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {ranked.map((scored, index) => (
            <ItemCard key={scored.item.id} scored={scored} rank={index + 1} />
          ))}
        </ul>
      )}
    </main>
  );
}
