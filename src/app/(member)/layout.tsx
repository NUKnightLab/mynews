import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";

// Member-facing area (ranked feed, weight settings, cross-member viewing,
// instrument responses).
export default async function MemberLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 p-4 text-sm">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <NavLink href="/feed">Feed</NavLink>
          <NavLink href="/feed/sources">Sources</NavLink>
          <NavLink href="/feed/settings">Settings</NavLink>
          <NavLink href="/members" activeMatch="prefix">
            Other Members
          </NavLink>
          {profile.role === "admin" && <NavLink href="/admin">Admin</NavLink>}
        </nav>
        <span className="flex items-center gap-4">
          {profile.display_name}
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
