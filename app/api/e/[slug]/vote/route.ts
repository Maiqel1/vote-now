import { FieldValue } from "firebase-admin/firestore";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { clearVoterSession, readVoterSession } from "@/lib/auth/voter-session";
import { generateCode, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { receiptEmail } from "@/lib/email/templates";
import { getEffectiveStatus } from "@/lib/election-status";
import { adminDb } from "@/lib/firebase-admin";
import { tallyIncrements } from "@/lib/results";
import { reserveEmails } from "@/lib/server/email-quota";
import {
  TALLY_SHARDS,
  ballotsCol,
  electionDoc,
  getBallot,
  getElectionBySlug,
  talliesCol,
  toElection,
  votersCol,
} from "@/lib/server/elections";
import { rateLimit } from "@/lib/server/rate-limit";
import type { Voter } from "@/lib/types";
import { validateSelections } from "@/lib/validation";

export const runtime = "nodejs";

class VoteRejected extends Error {}

function formatReceipt(raw: string): string {
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }

  const voterId = await readVoterSession(election.id);
  if (!voterId) {
    return NextResponse.json({ error: "Your voting session expired. Open your voting link again.", expired: true }, { status: 401 });
  }

  const limit = await rateLimit(`vote:${election.id}:${voterId}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });

  const status = getEffectiveStatus(election);
  if (status !== "open") {
    const message = status === "paused" ? "Voting is paused. Please try again shortly." : "Voting is not open.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { selections?: unknown } | null;
  const ballot = await getBallot(election.id);
  const validation = validateSelections(ballot, body?.selections, election.ballotOptions.requireAll);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const receipt = formatReceipt(generateCode(12));
  const receiptHash = sha256(`${election.id}:${receipt}`);
  const increments = tallyIncrements(validation.selections);
  const shardCounts: Record<string, Record<string, FieldValue>> = {};
  for (const [positionId, counts] of Object.entries(increments)) {
    shardCounts[positionId] = {};
    for (const key of Object.keys(counts)) shardCounts[positionId][key] = FieldValue.increment(1);
  }

  const db = adminDb();
  const voterRef = votersCol(election.id).doc(voterId);
  const electionRef = electionDoc(election.id);
  let voterEmail = "";

  try {
    await db.runTransaction(async (tx) => {
      const [voterSnap, electionSnap] = await Promise.all([tx.get(voterRef), tx.get(electionRef)]);
      if (!voterSnap.exists) throw new VoteRejected("You're not on the voter list for this election.");
      const voter = voterSnap.data() as Voter;
      if (voter.hasVoted) throw new VoteRejected("You have already voted.");
      const current = toElection(electionSnap.id, electionSnap.data());
      if (!current || getEffectiveStatus(current) !== "open") throw new VoteRejected("Voting is not open.");
      voterEmail = voter.email;

      const now = Date.now();
      tx.update(voterRef, { hasVoted: true, votedAt: now, "invite.reminderDue": false });
      tx.create(ballotsCol(election.id).doc(), { selections: validation.selections, receiptHash });
      tx.set(
        talliesCol(election.id).doc(String(randomInt(TALLY_SHARDS))),
        { counts: shardCounts, total: FieldValue.increment(1) },
        { merge: true },
      );
      if (current.lockedAt === null) tx.update(electionRef, { lockedAt: now });
    });
  } catch (error) {
    if (error instanceof VoteRejected) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Vote transaction failed", error);
    return NextResponse.json({ error: "We couldn't record your vote. Please try again." }, { status: 500 });
  }

  clearVoterSession(election.id);

  try {
    if (voterEmail && (await reserveEmails(1)) > 0) {
      const email = receiptEmail({ election, receipt });
      await sendEmail({ to: voterEmail, ...email, fromName: `${election.orgName} via VoteNow` });
    }
  } catch (error) {
    console.error("Receipt email failed", error);
  }

  return NextResponse.json({ ok: true, receipt });
}
