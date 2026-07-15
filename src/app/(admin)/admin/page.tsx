import { createClient } from "@/lib/supabase/server";
import { InviteForm } from "./invite-form";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: roster } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          Survey &amp; diary instruments (Phase 7-8) and retention tooling
          (Phase 9) land here later.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Invite a member</h2>
        <InviteForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Roster</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {roster?.map((member) => (
            <li key={member.id}>
              {member.display_name} - {member.role}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
