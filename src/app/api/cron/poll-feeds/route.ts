import { NextResponse, type NextRequest } from "next/server";
import { pollAllSources, pruneOldItems } from "@/lib/feeds/poll";

// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests - this
// also doubles as the local-dev trigger (curl with the same header).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await pollAllSources();
  const { deleted } = await pruneOldItems();

  return NextResponse.json({
    polled: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
    itemsPruned: deleted,
  });
}
