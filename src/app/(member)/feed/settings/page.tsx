import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { WeightsForm } from "./weights-form";
import { MoreLessButtons } from "../more-less-buttons";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ data: weights }, { data: affinities }, { data: tagWeights }] = await Promise.all([
    supabase.from("member_weights").select("*").eq("profile_id", profile.id).single(),
    supabase
      .from("member_source_affinity")
      .select("affinity, source:sources(id, title, url)")
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("member_tag_weights")
      .select("tag, weight")
      .eq("profile_id", profile.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">
          These are the same weights your &ldquo;more/less like this&rdquo;
          clicks adjust - nothing on your feed moves a number you can&apos;t
          see here.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Ranking weights</h2>
        <WeightsForm
          initialValues={{
            recency: weights?.recency ?? 1,
            sourceDiversity: weights?.source_diversity ?? 1,
            corroboration: weights?.corroboration ?? 1,
            popularity: weights?.popularity ?? 1,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Source preferences</h2>
        <p className="text-sm text-gray-500">
          Adjusted by clicking &ldquo;more/less like this&rdquo; on items from
          each source. 0 is neutral.
        </p>
        {affinities?.length ? (
          <ul className="flex max-w-md flex-col gap-2 text-sm">
            {affinities.map((row) =>
              row.source ? (
                <li
                  key={row.source.id}
                  className="flex items-center gap-2 border-b border-gray-100 pb-2"
                >
                  <MoreLessButtons
                    factor="source_affinity"
                    label={`from ${row.source.title ?? row.source.url}`}
                    sourceId={row.source.id}
                  />
                  <span>{row.source.title || row.source.url}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {row.affinity.toFixed(2)}
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No preferences yet - use &ldquo;more/less like this&rdquo; on your
            feed to build these up.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tag preferences</h2>
        <p className="text-sm text-gray-500">
          Adjusted by clicking &ldquo;more/less like this&rdquo; on a tag from
          the feed, or the arrows below. Tag sources on the{" "}
          <a href="/feed/sources" className="underline">
            Sources page
          </a>
          . 0 is neutral.
        </p>
        {tagWeights?.length ? (
          <ul className="flex max-w-md flex-col gap-2 text-sm">
            {tagWeights.map((row) => (
              <li
                key={row.tag}
                className="flex items-center gap-2 border-b border-gray-100 pb-2"
              >
                <MoreLessButtons
                  factor="tag_affinity"
                  label={`tagged "${row.tag}"`}
                  tag={row.tag}
                />
                <span>{row.tag}</span>
                <span className="ml-auto text-xs text-gray-500">
                  {row.weight.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No tag preferences yet - tag a source on the Sources page, then
            use &ldquo;more/less like this&rdquo; on its items.
          </p>
        )}
      </section>
    </main>
  );
}
