import { headers } from "next/headers";

// Prefers the request's own origin (works for the fixed local dev port and
// for Vercel preview/prod deployments alike) and falls back to an env var
// for contexts where headers() isn't available.
export async function getOrigin() {
  const origin = (await headers()).get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
}
