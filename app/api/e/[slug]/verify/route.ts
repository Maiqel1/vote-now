import { NextResponse } from "next/server";
import { normalizeCode, sha256 } from "@/lib/crypto";
import { ballotsCol, getElectionBySlug } from "@/lib/server/elections";
import { clientIp, rateLimit, retryMessage } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const limit = await rateLimit(`receipt:${clientIp()}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: retryMessage(limit.retryAfterMs) }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { receipt?: string } | null;
  const raw = normalizeCode(String(body?.receipt ?? ""));
  if (raw.length !== 12) return NextResponse.json({ error: "Receipt codes are 12 characters, like ABCD-EFGH-JKMN." }, { status: 400 });

  const receipt = raw.match(/.{1,4}/g)!.join("-");
  const snap = await ballotsCol(election.id).where("receiptHash", "==", sha256(`${election.id}:${receipt}`)).limit(1).get();
  return NextResponse.json({ ok: true, found: !snap.empty });
}
