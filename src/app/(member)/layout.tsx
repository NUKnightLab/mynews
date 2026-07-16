import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";

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
      <header className="flex items-center justify-between border-b border-gray-200 p-4 text-sm">
        <nav className="flex items-center gap-4">
          <Link href="/feed" className="underline">
            Feed
          </Link>
          <Link href="/feed/sources" className="underline">
            Sources
          </Link>
          <Link href="/feed/settings" className="underline">
            Settings
          </Link>
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
