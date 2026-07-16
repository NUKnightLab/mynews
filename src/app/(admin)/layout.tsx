import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";

// Admin-only area (roster/invites, survey & diary instruments, retention
// tooling).
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/feed");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 p-4 text-sm">
        {/* Same order as the member nav (see (member)/layout.tsx) so
            Admin doesn't jump position when crossing between areas. */}
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NavLink href="/feed">Feed</NavLink>
          <NavLink href="/feed/sources">Sources</NavLink>
          <NavLink href="/feed/settings">Settings</NavLink>
          <NavLink href="/members" activeMatch="prefix">
            Other Members
          </NavLink>
          <NavLink href="/admin">Admin</NavLink>
        </nav>
        <span className="flex items-center gap-4">
          {profile.display_name} (admin)
          <form action={signOut}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </span>
      </header>
      {children}
    </div>
  );
}
