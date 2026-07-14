import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">RSS Filter</h1>
      <p className="text-sm text-gray-500">
        Invite-only. Sign-in and roster management arrive in Phase 1.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/feed" className="underline">
          Member feed (placeholder)
        </Link>
        <Link href="/admin" className="underline">
          Admin dashboard (placeholder)
        </Link>
      </div>
    </main>
  );
}
