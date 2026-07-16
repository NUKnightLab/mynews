import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";

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
      <header className="flex items-center justify-between border-b border-gray-200 p-4 text-sm">
        <nav className="flex items-center gap-4">
          <Link href="/admin" className="underline">
            Admin
          </Link>
          <Link href="/feed" className="underline">
            Feed
          </Link>
          <Link href="/feed/sources" className="underline">
            Sources
          </Link>
          <Link href="/feed/settings" className="underline">
            Settings
          </Link>
          <Link href="/members" className="underline">
            Other Members
          </Link>
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
