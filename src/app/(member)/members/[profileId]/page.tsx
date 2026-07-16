import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankForMember } from "@/lib/ranking/rank-for-member";

// Read-only: DESIGN_BRIEF.md §6 scopes this strictly to "their current
// ranked view" - no subscription list, no weight values, no "why am I
// seeing this," no more/less. We compute the full ScoredItem (reasons
// included) because rankForMember always returns them, but only
// `.item` is ever rendered below - reasons are simply discarded, which is
// what "strip provenance/weight detail before rendering" means in
// practice (see PROJECT_PLAN.md Phase 6).
//
// Uses the admin client (not the viewer's session) because member_weights
// /member_source_affinity/member_subscriptions are self-only under RLS -
// there is no way to compute another member's ranking without a
// privileged read. Group membership is checked explicitly below before
// that privileged read ever happens.
export default async function MemberFeedPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const viewer = await getCurrentProfile();
  if (!viewer) return null;

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, display_name, group_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!target || target.group_id !== viewer.group_id) {
    return (
      <main className="flex flex-1 flex-col gap-2 p-8">
        <p className="text-sm text-gray-500">Member not found.</p>
      </main>
    );
  }

  const ranked = await rankForMember(admin, target.id);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <Link href="/members" className="text-xs text-gray-500 underline">
          &larr; Other members
        </Link>
        <h1 className="text-xl font-semibold">{target.display_name}&apos;s Feed</h1>
        <p className="text-sm text-gray-500">
          Read-only - this is what {target.display_name} currently sees,
          ranked with their own settings.
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-gray-500">No items yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {ranked.map(({ item }) => (
            <li key={item.id} className="flex flex-col gap-1 border-b border-gray-100 pb-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
              >
                {item.title}
              </a>
              <div className="text-xs text-gray-500">
                {item.sourceTitle ?? "Unknown source"}
                {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleString()}` : ""}
              </div>
              {item.summary && (
                <p className="line-clamp-2 text-sm text-gray-700">{item.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
