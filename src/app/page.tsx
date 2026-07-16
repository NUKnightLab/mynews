import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">RSS Filter</h1>
      <p className="text-sm text-gray-500">Invite-only.</p>
      <Link href="/login" className="underline">
        Sign in
      </Link>
    </main>
  );
}
