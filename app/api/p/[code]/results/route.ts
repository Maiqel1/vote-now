import { NextResponse } from "next/server";
import { resultsPayload } from "@/lib/polls";
import { withErrorLog } from "@/lib/server/error-log";
import { getPoll, getPollResults } from "@/lib/server/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGet(_request: Request, { params }: { params: { code: string } }) {
  const poll = await getPoll(params.code);
  if (!poll) return NextResponse.json({ error: "This poll doesn't exist." }, { status: 404 });
  if (poll.removedAt !== null) {
    return NextResponse.json({ error: "This poll was removed.", removed: true }, { status: 410 });
  }
  const results = await getPollResults(poll.code);
  return NextResponse.json(resultsPayload(poll, results), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=8" },
  });
}

export const GET = withErrorLog("api: poll results", handleGet);
