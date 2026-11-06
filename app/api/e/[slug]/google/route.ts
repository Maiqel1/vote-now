import { NextResponse } from "next/server";
import { setVoterSession } from "@/lib/auth/voter-session";
import { getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime, maskEmail, maskName } from "@/lib/format";
import { RATE_KEYS } from "@/lib/rate-limit-keys";
import { getElectionBySlug } from "@/lib/server/elections";
import { withErrorLog } from "@/lib/server/error-log";
import { verifyGoogleIdToken } from "@/lib/server/google-id";
import { clientIp, rateLimit, retryMessage } from "@/lib/server/rate-limit";
import { findVoterByEmail } from "@/lib/server/voters";
import type { Voter } from "@/lib/types";
import { googleVoterDecision } from "@/lib/voter-access";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;

async function handlePost(request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") return NextResponse.json({ error: "Election not found." }, { status: 404 });
  if (election.voterAccess !== "google") {
    return NextResponse.json({ error: "This election doesn't use Google sign-in. Use the link or code from your invitation." }, { status: 400 });
  }
  const status = getEffectiveStatus(election);
  if (status === "scheduled") return NextResponse.json({ error: "Voting hasn't opened yet." }, { status: 400 });
  if (status === "closed") return NextResponse.json({ error: "Voting has closed." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { googleToken?: unknown } | null;
  const ip = clientIp();
  const ipLimit = await rateLimit(RATE_KEYS.voterGoogleIp(ip), 600, WINDOW_MS);
  if (!ipLimit.ok) return NextResponse.json({ error: retryMessage(ipLimit.retryAfterMs) }, { status: 429 });

  const identity = await verifyGoogleIdToken(body?.googleToken);
  if (!identity) return NextResponse.json({ error: "Google sign-in didn't work. Please try again." }, { status: 401 });
  if (identity.email) {
    const emailLimit = await rateLimit(RATE_KEYS.voterGoogleEmail(election.id, identity.email), 10, WINDOW_MS);
    if (!emailLimit.ok) return NextResponse.json({ error: retryMessage(emailLimit.retryAfterMs) }, { status: 429 });
  }

  const snap = identity.email && identity.emailVerified ? await findVoterByEmail(election.id, identity.email) : null;
  const voter = snap ? (snap.data() as Voter) : null;
  const decision = googleVoterDecision(identity, snap && voter ? { id: snap.id, hasVoted: voter.hasVoted } : null);

  if (!decision.ok) {
    if (decision.reason === "unverified") {
      return NextResponse.json({ error: "Google hasn't verified this account's email address. Use a verified Google account." }, { status: 403 });
    }
    if (decision.reason === "alreadyVoted") {
      return NextResponse.json(
        {
          error: `You already voted${voter?.votedAt ? ` on ${formatDateTime(voter.votedAt, election.timezone)}` : ""}. Each voter can vote once.`,
          alreadyVoted: true,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: `This Google account (${maskEmail(identity.email ?? "")}) isn't on the voter list for this election. Sign in with the email address your organizer added, or contact them.`,
        notListed: true,
      },
      { status: 403 },
    );
  }

  await setVoterSession(election.id, decision.voterId);
  return NextResponse.json({ ok: true, voter: { display: maskName(voter?.name ?? "", voter?.email ?? "") } });
}

export const POST = withErrorLog("api: voter Google sign-in", handlePost);
