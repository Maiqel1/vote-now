"use server";

import { revalidatePath } from "next/cache";
import { isEmailVerified } from "../auth/session";
import { invitationEmail } from "../email/templates";
import { getEffectiveStatus } from "../election-status";
import { adminDb } from "../firebase-admin";
import { EMAIL_CHUNK_SIZE, FREE_PLAN } from "../plans";
import { logAudit } from "../server/audit";
import { reserveEmails } from "../server/email-quota";
import { electionDoc, votersCol } from "../server/elections";
import { deliverCredentials } from "../server/invitations";
import type { ActionResult, Election, Voter } from "../types";
import { ActionError, fail, ok, requireElection, run } from "./guard";

export interface ChunkReport {
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  capReached: boolean;
}

function assertCanSend(election: Election) {
  if (election.status !== "published") throw new ActionError("Publish the election before sending invitations.");
  const status = getEffectiveStatus(election);
  if (status === "closed") throw new ActionError("Voting has closed.");
  if (election.piiPurgedAt !== null) throw new ActionError("Voter data has been deleted.");
}

export async function saveInviteMessage(electionId: string, message: string): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireElection(electionId, "admin");
    const trimmed = String(message ?? "").trim();
    if (trimmed.length > 1000) return fail("Keep the message under 1,000 characters.");
    await electionDoc(electionId).update({ inviteMessage: trimmed, updatedAt: Date.now() });
    await logAudit(electionId, actor, "invitations.message_updated");
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    return ok();
  });
}

export async function previewInvitation(electionId: string, message: string): Promise<ActionResult<{ html: string; subject: string }>> {
  return run(async () => {
    const { election } = await requireElection(electionId, "observer");
    const email = invitationEmail({
      election,
      voterName: "Ada Lovelace",
      token: "preview-link",
      code: "ABCD2345",
      customMessage: String(message ?? "").trim() || undefined,
      kind: "invite",
    });
    return ok({ html: email.html, subject: email.subject });
  });
}

export async function sendInvitationsChunk(
  electionId: string,
  kind: "invite" | "reminder",
): Promise<ActionResult<ChunkReport>> {
  return run(async () => {
    const { election, actor, user } = await requireElection(electionId, "admin");
    assertCanSend(election);
    if (!(await isEmailVerified(user.uid))) {
      return fail("Verify your email address before sending invitations. Check your inbox for the verification link.");
    }

    const base =
      kind === "invite"
        ? votersCol(electionId).where("invite.status", "==", "notSent")
        : votersCol(electionId).where("invite.reminderDue", "==", true);

    const snap = await base.limit(EMAIL_CHUNK_SIZE).get();
    const overLimit = snap.docs.filter((d) => (d.data() as Voter).invite.count >= FREE_PLAN.invitesPerVoter);
    const eligible = snap.docs.filter(
      (d) => (d.data() as Voter).invite.count < FREE_PLAN.invitesPerVoter && !(d.data() as Voter).hasVoted,
    );
    const alreadyVoted = snap.docs.filter((d) => (d.data() as Voter).hasVoted);

    if (overLimit.length > 0 || alreadyVoted.length > 0) {
      const batch = adminDb().batch();
      overLimit.forEach((d) =>
        batch.update(d.ref, {
          "invite.status": "failed",
          "invite.reminderDue": false,
          "invite.lastError": `Limit of ${FREE_PLAN.invitesPerVoter} emails per voter reached`,
        }),
      );
      alreadyVoted.forEach((d) => batch.update(d.ref, { "invite.reminderDue": false }));
      await batch.commit();
    }

    const granted = await reserveEmails(eligible.length);
    const report =
      granted > 0
        ? await deliverCredentials({ election, voters: eligible.slice(0, granted), kind, replyTo: user.email })
        : { sent: 0, failed: 0, skipped: 0 };

    const remaining = (await base.count().get()).data().count;
    if (report.sent + report.failed + report.skipped > 0) {
      await logAudit(electionId, actor, kind === "invite" ? "invitations.sent" : "reminders.sent", { ...report });
    }
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    return ok({ ...report, remaining, capReached: granted < eligible.length });
  });
}

export async function startReminderRound(electionId: string): Promise<ActionResult<{ due: number }>> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    assertCanSend(election);
    const status = getEffectiveStatus(election);
    if (status !== "open" && status !== "paused") return fail("Reminders can be sent while voting is open.");
    if (election.reminderRound >= FREE_PLAN.reminderRounds) {
      return fail(`The free plan includes ${FREE_PLAN.reminderRounds} reminder rounds per election.`);
    }

    const snap = await votersCol(electionId).where("hasVoted", "==", false).where("invite.status", "==", "sent").get();
    if (snap.empty) return fail("Everyone who was emailed has voted. No reminders needed.");

    const db = adminDb();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { "invite.reminderDue": true }));
      await batch.commit();
    }
    await electionDoc(electionId).update({ reminderRound: election.reminderRound + 1, updatedAt: Date.now() });
    await logAudit(electionId, actor, "reminders.round_started", { round: election.reminderRound + 1, due: snap.size });
    return ok({ due: snap.size });
  });
}

export async function retryFailedInvitations(electionId: string): Promise<ActionResult<{ queued: number }>> {
  return run(async () => {
    const { election } = await requireElection(electionId, "admin");
    assertCanSend(election);
    const snap = await votersCol(electionId).where("invite.status", "==", "failed").get();
    const retryable = snap.docs.filter(
      (d) => !(d.data() as Voter).hasVoted && (d.data() as Voter).invite.count < FREE_PLAN.invitesPerVoter,
    );
    const batch = adminDb().batch();
    retryable.forEach((d) => batch.update(d.ref, { "invite.status": "notSent", "invite.lastError": null }));
    await batch.commit();
    return ok({ queued: retryable.length });
  });
}

export async function resendInvitation(electionId: string, voterId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor, user } = await requireElection(electionId, "admin");
    assertCanSend(election);
    if (!(await isEmailVerified(user.uid))) return fail("Verify your email address before sending invitations.");
    const snap = await votersCol(electionId).doc(voterId).get();
    if (!snap.exists) return fail("Voter not found.");
    const voter = snap.data() as Voter;
    if (voter.hasVoted) return fail("This voter has already voted.");
    if (voter.invite.count >= FREE_PLAN.invitesPerVoter) {
      return fail(`This voter has already been emailed ${FREE_PLAN.invitesPerVoter} times. Print a slip instead.`);
    }
    if ((await reserveEmails(1)) === 0) return fail("The platform's daily email limit has been reached. Try again tomorrow.");

    const report = await deliverCredentials({ election, voters: [snap], kind: "resend", replyTo: user.email });
    if (report.failed > 0) return fail("The email couldn't be sent. Check the address and try again.");
    await logAudit(electionId, actor, "invitations.resent", { voterId });
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    return ok();
  });
}

