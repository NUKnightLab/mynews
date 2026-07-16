import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { WeightsForm } from "./weights-form";
import { adjustReason } from "../actions";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ data: weights }, { data: affinities }] = await Promise.all([
    supabase.from("member_weights").select("*").eq("profile_id", profile.id).single(),
    supabase
      .from("member_source_affinity")
      .select("affinity, source:sources(id, title, url)")
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
                  className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2"
                >
                  <span>{row.source.title || row.source.url}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-gray-500">{row.affinity.toFixed(2)}</span>
                    <form action={adjustReason}>
                      <input type="hidden" name="factor" value="source_affinity" />
                      <input type="hidden" name="direction" value="less" />
                      <input type="hidden" name="sourceId" value={row.source.id} />
                      <button
                        type="submit"
                        aria-label={`Less from ${row.source.title ?? row.source.url}`}
                        className="rounded border border-gray-300 px-1.5 leading-none"
                      >
                        &minus;
                      </button>
                    </form>
                    <form action={adjustReason}>
                      <input type="hidden" name="factor" value="source_affinity" />
                      <input type="hidden" name="direction" value="more" />
                      <input type="hidden" name="sourceId" value={row.source.id} />
                      <button
                        type="submit"
                        aria-label={`More from ${row.source.title ?? row.source.url}`}
                        className="rounded border border-gray-300 px-1.5 leading-none"
                      >
                        +
                      </button>
                    </form>
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
    </main>
  );
}
