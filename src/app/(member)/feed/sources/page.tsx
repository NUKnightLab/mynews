import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { FeedForm } from "./feed-form";
import { removeFeed, addSourceTag, removeSourceTag } from "./actions";

export default async function FeedPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ data: subscriptions }, { data: tagRows }] = await Promise.all([
    supabase
      .from("member_subscriptions")
      .select("id, source:sources(id, url, title, site_url)")
      .order("created_at", { ascending: true }),
    supabase
      .from("member_source_tags")
      .select("id, source_id, tag")
      .eq("profile_id", profile.id)
      .order("tag", { ascending: true }),
  ]);

  const tagsBySource = new Map<string, { id: string; tag: string }[]>();
  for (const row of tagRows ?? []) {
    const list = tagsBySource.get(row.source_id) ?? [];
    list.push({ id: row.id, tag: row.tag });
    tagsBySource.set(row.source_id, list);
  }

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">Manage Sources</h1>
        <p className="text-sm text-gray-500">
          Add or remove the feeds that make up your ranked reading view. Tag
          a source to weight it as a group in Settings.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a feed</h2>
        <FeedForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Subscribed</h2>
        {subscriptions?.length ? (
          <ul className="flex flex-col gap-3 text-sm">
            {subscriptions.map((sub) => {
              if (!sub.source) return null;
              const tags = tagsBySource.get(sub.source.id) ?? [];
              return (
                <li
                  key={sub.id}
                  className="flex flex-col gap-2 border-b border-gray-100 pb-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {sub.source.title || sub.source.url}
                      </div>
                      <div className="text-gray-500">{sub.source.url}</div>
                    </div>
                    <form action={removeFeed}>
                      <input type="hidden" name="subscriptionId" value={sub.id} />
                      <button type="submit" className="text-red-600 underline">
                        Remove
                      </button>
                    </form>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {tags.map((t) => (
                      <span
                        key={t.id}
                        className="flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-xs"
                      >
                        {t.tag}
                        <form action={removeSourceTag}>
                          <input type="hidden" name="tagId" value={t.id} />
                          <button
                            type="submit"
                            aria-label={`Remove tag ${t.tag}`}
                            className="text-gray-400 hover:text-black"
                          >
                            &times;
                          </button>
                        </form>
                      </span>
                    ))}
                    <form action={addSourceTag} className="flex items-center gap-1">
                      <input type="hidden" name="sourceId" value={sub.source.id} />
                      <input
                        type="text"
                        name="tag"
                        placeholder="Add tag"
                        maxLength={40}
                        className="w-24 rounded border border-gray-300 px-2 py-0.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded border border-gray-300 px-2 py-0.5 text-xs"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No feeds yet.</p>
        )}
      </section>
    </main>
  );
}
