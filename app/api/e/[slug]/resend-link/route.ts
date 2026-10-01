import { NextResponse } from "next/server";
import { getEffectiveStatus } from "@/lib/election-status";
import { FREE_PLAN } from "@/lib/plans";
import { logAudit, SYSTEM_ACTOR } from "@/lib/server/audit";
import { reserveEmails } from "@/lib/server/email-quota";
import { getElectionBySlug, votersCol } from "@/lib/server/elections";
import { deliverCredentials, ownerEmail } from "@/lib/server/invitations";
import { clientIp, rateLimit, retryMessage } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";
import type { Voter } from "@/lib/types";

export const runtime = "nodejs";

const GENERIC = "If that email is on the voter list and hasn't voted yet, a new voting link is on its way.";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") {
    return NextResponse.json({ error: "Election not found." }, { status: 404 });
  }
  const status = getEffectiveStatus(election);
  if (status === "closed") return NextResponse.json({ error: "Voting has closed." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { email?: string; turnstileToken?: string } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "Enter the email address you were invited with." }, { status: 400 });

  const ip = clientIp();
  const ipLimit = await rateLimit(`resend-ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.ok) return NextResponse.json({ error: retryMessage(ipLimit.retryAfterMs) }, { status: 429 });
  const emailLimit = await rateLimit(`resend-email:${election.id}:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) return NextResponse.json({ error: retryMessage(emailLimit.retryAfterMs) }, { status: 429 });
  if (!(await verifyTurnstile(body?.turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed. Please retry the challenge." }, { status: 400 });
  }

  const snap = await votersCol(election.id).where("emailLower", "==", email).limit(1).get();
  const voterSnap = snap.docs[0];
  const voter = voterSnap?.data() as Voter | undefined;

  if (voter && !voter.hasVoted && voter.invite.count < FREE_PLAN.invitesPerVoter && (await reserveEmails(1)) > 0) {
    const report = await deliverCredentials({
      election,
      voters: [voterSnap],
      kind: "resend",
      replyTo: await ownerEmail(election),
    });
    if (report.sent + report.skipped > 0) {
      await logAudit(election.id, SYSTEM_ACTOR, "invitations.self_resent", { voterId: voterSnap.id });
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC });
}
