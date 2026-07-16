"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Renders the current page as inert text (no href, default cursor)
// instead of a clickable link, so the nav visibly - and functionally -
// shows where you are rather than offering a no-op click to reload the
// same page.
export function NavLink({
  href,
  children,
  activeMatch = "exact",
}: {
  href: string;
  children: React.ReactNode;
  activeMatch?: "exact" | "prefix";
}) {
  const pathname = usePathname();
  const isActive =
    activeMatch === "exact" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (isActive) {
    return (
      <span aria-current="page" className="cursor-default font-semibold text-black">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className="text-gray-600 underline hover:text-black">
      {children}
    </Link>
  );
}
