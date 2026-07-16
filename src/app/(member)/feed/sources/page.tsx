import { createClient } from "@/lib/supabase/server";
import { FeedForm } from "./feed-form";
import { removeFeed } from "./actions";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("member_subscriptions")
    .select("id, source:sources(id, url, title, site_url)")
    .order("created_at", { ascending: true });

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">Manage Sources</h1>
        <p className="text-sm text-gray-500">
          Add or remove the feeds that make up your ranked reading view.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a feed</h2>
        <FeedForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Subscribed</h2>
        {subscriptions?.length ? (
          <ul className="flex flex-col gap-2 text-sm">
            {subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2"
              >
                <div>
                  <div className="font-medium">
                    {sub.source?.title || sub.source?.url}
                  </div>
                  <div className="text-gray-500">{sub.source?.url}</div>
                </div>
                <form action={removeFeed}>
                  <input type="hidden" name="subscriptionId" value={sub.id} />
                  <button type="submit" className="text-red-600 underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No feeds yet.</p>
        )}
      </section>
    </main>
  );
}
