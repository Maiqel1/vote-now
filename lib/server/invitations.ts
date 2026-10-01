import "server-only";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { generateCode, hashCode, hashToken, randomToken } from "../crypto";
import { sendEmail } from "../email";
import { invitationEmail } from "../email/templates";
import { adminDb } from "../firebase-admin";
import type { Election, InviteStatus, Voter } from "../types";
import { releaseEmails } from "./email-quota";
import { electionDoc } from "./elections";

export interface Credentials {
  token: string;
  code: string;
}

export interface DeliveryReport {
  sent: number;
  failed: number;
  skipped: number;
}

const COUNTED: InviteStatus[] = ["sent", "printed"];

export function newCredentials(electionId: string): Credentials & { tokenHash: string; codeHash: string } {
  const token = randomToken();
  const code = generateCode();
  return { token, code, tokenHash: hashToken(token), codeHash: hashCode(electionId, code) };
}

export function invitedDelta(before: InviteStatus, after: InviteStatus): number {
  return Number(COUNTED.includes(after)) - Number(COUNTED.includes(before));
}

async function runInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function deliverCredentials(params: {
  election: Election;
  voters: DocumentSnapshot[];
  kind: "invite" | "reminder" | "resend";
  replyTo?: string;
}): Promise<DeliveryReport> {
  const { election, voters, kind, replyTo } = params;
  const report: DeliveryReport = { sent: 0, failed: 0, skipped: 0 };
  let invitedChange = 0;

  await runInBatches(voters, 5, async (snap) => {
    const voter = snap.data() as Omit<Voter, "id">;
    const creds = newCredentials(election.id);
    const now = Date.now();

    await snap.ref.update({
      tokenHash: creds.tokenHash,
      codeHash: creds.codeHash,
      "invite.status": "sent",
      "invite.sentAt": now,
      "invite.count": FieldValue.increment(1),
      "invite.reminderDue": false,
      "invite.lastError": null,
    });

    try {
      const email = invitationEmail({
        election,
        voterName: voter.name,
        token: creds.token,
        code: creds.code,
        customMessage: election.inviteMessage || undefined,
        kind,
      });
      const result = await sendEmail({
        to: voter.email,
        ...email,
        replyTo,
        fromName: `${election.orgName} via VoteNow`,
      });
      if (result === "skipped") report.skipped++;
      else report.sent++;
      invitedChange += invitedDelta(voter.invite.status, "sent");
    } catch (error) {
      report.failed++;
      const message = error instanceof Error ? error.message.slice(0, 200) : "Send failed";
      await snap.ref.update({ "invite.status": "failed", "invite.lastError": message });
      invitedChange += invitedDelta(voter.invite.status, "failed");
    }
  });

  if (invitedChange !== 0) {
    await electionDoc(election.id).update({ "counts.invited": FieldValue.increment(invitedChange) });
  }
  await releaseEmails(report.failed + report.skipped);
  return report;
}

export async function ownerEmail(election: Election): Promise<string | undefined> {
  const snap = await adminDb().collection("users").doc(election.ownerId).get();
  return (snap.data()?.email as string | undefined) || undefined;
}
