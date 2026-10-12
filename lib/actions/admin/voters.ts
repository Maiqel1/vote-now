"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "../../auth/superadmin";
import { getEffectiveStatus } from "../../election-status";
import { adminDb } from "../../firebase-admin";
import { ipRateKeys, voterRateKeys } from "../../rate-limit-keys";
import type { ActionResult, Election, Voter } from "../../types";
import { voterInputSchema } from "../../validation";
import { logAdminAction } from "../../server/admin-audit";
import { logAudit, SUPPORT_ACTOR } from "../../server/audit";
import { reserveEmails } from "../../server/email-quota";
import { electionDoc, getElection, votersCol } from "../../server/elections";
import { deliverCredentials, invitedDelta, ownerEmail } from "../../server/invitations";
import { clearRateLimits } from "../../server/rate-limit";
import { ActionError, fail, ok, run, zodMessage } from "../guard";

async function loadVoter(electionId: string, voterId: string): Promise<{ election: Election; voter: Voter; snap: FirebaseFirestore.DocumentSnapshot }> {
  const election = typeof electionId === "string" ? await getElection(electionId) : null;
  if (!election) throw new ActionError("Election not found.");
  if (typeof voterId !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(voterId)) throw new ActionError("Voter not found.");
  const snap = await votersCol(election.id).doc(voterId).get();
  if (!snap.exists) throw new ActionError("Voter not found.");
  return { election, voter: { ...(snap.data() as Omit<Voter, "id">), id: snap.id }, snap };
}

function refresh(election: Election) {
  revalidatePath("/admin/voters");
  revalidatePath(`/admin/elections/${election.id}`);
  revalidatePath(`/dashboard/e/${election.id}`, "layout");
}

export async function adminResendInvitation(electionId: string, voterId: string): Promise<ActionResult<{ sent: boolean }>> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const { election, voter, snap } = await loadVoter(electionId, voterId);
    if (election.status !== "published") return fail("The election isn't published yet.");
    if (getEffectiveStatus(election) === "closed") return fail("Voting has closed.");
    if (election.piiPurgedAt !== null) return fail("Voter data for this election was deleted.");
    if (voter.hasVoted) return fail("This voter has already voted.");
    if ((await reserveEmails(1)) === 0) return fail("The daily email limit has been reached. Raise it in Settings or try tomorrow.");

    const report = await deliverCredentials({ election, voters: [snap], kind: "resend", replyTo: await ownerEmail(election) });
    if (report.failed > 0) {
      const fresh = (await snap.ref.get()).data() as Voter | undefined;
      return fail(`The email couldn't be sent: ${fresh?.invite.lastError ?? "unknown error"}`);
    }
    await logAudit(election.id, SUPPORT_ACTOR, "invitations.resent", { voterId: voter.id });
    await logAdminAction(admin, "voter.invitation_resent", { type: "voter", id: voter.id, label: voter.email }, { electionId: election.id, skipped: report.skipped > 0 });
    refresh(election);
    return ok({ sent: report.sent > 0 });
  });
}

export async function adminUpdateVoterEmail(electionId: string, voterId: string, email: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const { election, voter, snap } = await loadVoter(electionId, voterId);
    if (election.piiPurgedAt !== null) return fail("Voter data for this election was deleted.");
    if (voter.hasVoted) return fail("This voter has already voted, so their email can't change.");
    const parsed = voterInputSchema.safeParse({ email, name: voter.name });
    if (!parsed.success) return fail(zodMessage(parsed.error));
    if (parsed.data.email === voter.emailLower) return fail("That's already their email.");
    const clash = await votersCol(election.id).where("emailLower", "==", parsed.data.email).limit(1).get();
    if (!clash.empty) return fail("Another voter in this election already uses that email.");

    const batch = adminDb().batch();
    batch.update(snap.ref, {
      email: parsed.data.email,
      emailLower: parsed.data.email,
      tokenHash: null,
      codeHash: null,
      "invite.status": "notSent",
      "invite.reminderDue": false,
      "invite.lastError": null,
    });
    const delta = invitedDelta(voter.invite.status, "notSent");
    if (delta !== 0) batch.update(electionDoc(election.id), { "counts.invited": FieldValue.increment(delta) });
    await batch.commit();
    await logAudit(election.id, SUPPORT_ACTOR, "voters.updated", { emailChanged: true });
    await logAdminAction(admin, "voter.email_corrected", { type: "voter", id: voter.id, label: parsed.data.email }, { electionId: election.id, from: voter.email });
    refresh(election);
    return ok();
  });
}

export async function adminUnblockVoter(electionId: string, voterId: string): Promise<ActionResult<{ cleared: number }>> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const { election, voter } = await loadVoter(electionId, voterId);
    const cleared = await clearRateLimits(voterRateKeys(election.id, voter.email, voter.id));
    await logAudit(election.id, SUPPORT_ACTOR, "voters.unblocked", { voterId: voter.id });
    await logAdminAction(admin, "voter.unblocked", { type: "voter", id: voter.id, label: voter.email }, { electionId: election.id, cleared });
    refresh(election);
    return ok({ cleared });
  });
}

export async function adminUnblockIp(ip: string): Promise<ActionResult<{ cleared: number }>> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const clean = String(ip ?? "").trim();
    if (!/^[0-9a-fA-F:.]{3,45}$/.test(clean)) return fail("Enter a valid IP address.");
    const cleared = await clearRateLimits(ipRateKeys(clean));
    await logAdminAction(admin, "ip.unblocked", { type: "ip", id: clean }, { cleared });
    revalidatePath("/admin/voters");
    revalidatePath("/admin");
    return ok({ cleared });
  });
}
