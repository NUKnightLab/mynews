import { confirmSignIn } from "./actions";

// Deliberately requires a real click (a POST via the form below) before
// verifying the token. Rendering this page on GET must NOT consume the
// token - some institutional email systems (e.g. Microsoft Defender Safe
// Links) prefetch links in email to scan them, and a link that verifies
// on GET gets silently burned before the person ever clicks it.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;

  if (!token_hash || !type) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Invalid link</h1>
        <p className="text-sm text-gray-500">
          This confirmation link is missing required information.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Confirm sign-in</h1>
      <p className="max-w-sm text-sm text-gray-500">
        Click below to finish signing in. This extra click (instead of
        signing you in automatically) keeps email security scanners from
        using up your link before you do.
      </p>
      <form action={confirmSignIn}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Confirm and sign in
        </button>
      </form>
    </main>
  );
}
