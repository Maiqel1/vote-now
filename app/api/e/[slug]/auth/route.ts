import { NextResponse } from "next/server";
import { setVoterSession } from "@/lib/auth/voter-session";
import { hashCode, hashToken, normalizeCode } from "@/lib/crypto";
import { getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime, maskName } from "@/lib/format";
import { getElectionBySlug, votersCol } from "@/lib/server/elections";
import { clientIp, rateLimit, retryMessage } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import type { Voter } from "@/lib/types";

export const runtime = "nodejs";

const INVALID = "That email and code don't match our voter list. Check your invitation email.";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }
  const status = getEffectiveStatus(election);
  if (status === "scheduled") return NextResponse.json({ error: "Voting hasn't opened yet." }, { status: 400 });
  if (status === "closed") return NextResponse.json({ error: "Voting has closed." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    email?: string;
    code?: string;
    turnstileToken?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ip = clientIp();
  const ipLimit = await rateLimit(`voter-auth-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.ok) return NextResponse.json({ error: retryMessage(ipLimit.retryAfterMs) }, { status: 429 });

  let voterSnap;
  if (body.token) {
    const snap = await votersCol(election.id).where("tokenHash", "==", hashToken(body.token)).limit(1).get();
    if (snap.empty) {
      return NextResponse.json(
        { error: "This voting link is no longer valid. Use the most recent email you received, or enter your email and code." },
        { status: 401 },
      );
    }
    voterSnap = snap.docs[0];
  } else {
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = normalizeCode(String(body.code ?? ""));
    if (!email || code.length !== 8) return NextResponse.json({ error: INVALID }, { status: 400 });

    const emailLimit = await rateLimit(`voter-auth-email:${election.id}:${email}`, 5, 15 * 60 * 1000);
    if (!emailLimit.ok) return NextResponse.json({ error: retryMessage(emailLimit.retryAfterMs) }, { status: 429 });
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed. Please retry the challenge." }, { status: 400 });
    }

    const snap = await votersCol(election.id).where("emailLower", "==", email).limit(1).get();
    if (snap.empty || (snap.docs[0].data() as Voter).codeHash !== hashCode(election.id, code)) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }
    voterSnap = snap.docs[0];
  }

  const voter = voterSnap.data() as Voter;
  if (voter.hasVoted) {
    return NextResponse.json(
      {
        error: `You already voted${voter.votedAt ? ` on ${formatDateTime(voter.votedAt, election.timezone)}` : ""}. Each voter can vote once.`,
        alreadyVoted: true,
      },
      { status: 409 },
    );
  }

  await setVoterSession(election.id, voterSnap.id);
  return NextResponse.json({ ok: true, voter: { display: maskName(voter.name, voter.email) } });
}
