"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { formatCode } from "../crypto";
import { getEffectiveStatus } from "../election-status";
import { adminDb } from "../firebase-admin";
import { appUrl } from "../format";
import { FREE_PLAN } from "../plans";
import { logAudit } from "../server/audit";
import { electionDoc, votersCol } from "../server/elections";
import { invitedDelta, newCredentials } from "../server/invitations";
import type { ActionResult, Election, Voter } from "../types";
import { voterInputSchema } from "../validation";
import { fail, ok, requireElection, run, zodMessage } from "./guard";

export interface AddVotersReport {
  added: number;
  duplicates: string[];
  invalid: { row: number; value: string; reason: string }[];
  overLimit: number;
}

export interface PrintSlip {
  name: string;
  email: string;
  code: string;
  link: string;
}

function assertEditable(election: Election) {
  if (election.piiPurgedAt !== null) return "Voter data for this election has been deleted.";
  if (getEffectiveStatus(election) === "closed") return "Voting has closed. The voter list can no longer change.";
  return null;
}

function refresh(electionId: string) {
  revalidatePath(`/dashboard/e/${electionId}`, "layout");
}

export async function addVoters(
  electionId: string,
  rows: { email: string; name?: string }[],
): Promise<ActionResult<AddVotersReport>> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const blocked = assertEditable(election);
    if (blocked) return fail(blocked);
    if (!Array.isArray(rows) || rows.length === 0) return fail("No voters to add.");
    if (rows.length > 1000) return fail("Import at most 1,000 rows at a time.");

    const existing = await votersCol(electionId).select("emailLower").get();
    const seen = new Set(existing.docs.map((d) => d.data().emailLower as string));
    const report: AddVotersReport = { added: 0, duplicates: [], invalid: [], overLimit: 0 };
    const accepted: { email: string; name: string }[] = [];

    rows.forEach((row, index) => {
      const parsed = voterInputSchema.safeParse({ email: row?.email ?? "", name: row?.name ?? "" });
      if (!parsed.success) {
        report.invalid.push({ row: index + 1, value: String(row?.email ?? ""), reason: zodMessage(parsed.error) });
        return;
      }
      if (seen.has(parsed.data.email)) {
        report.duplicates.push(parsed.data.email);
        return;
      }
      seen.add(parsed.data.email);
      accepted.push(parsed.data);
    });

    const room = Math.max(0, FREE_PLAN.votersPerElection - existing.size);
    const toAdd = accepted.slice(0, room);
    report.overLimit = accepted.length - toAdd.length;

    const db = adminDb();
    const now = Date.now();
    for (let i = 0; i < toAdd.length; i += 400) {
      const chunk = toAdd.slice(i, i + 400);
      const batch = db.batch();
      for (const voter of chunk) {
        batch.set(votersCol(electionId).doc(), {
          email: voter.email,
          emailLower: voter.email.toLowerCase(),
          name: voter.name,
          tokenHash: null,
          codeHash: null,
          invite: { status: "notSent", sentAt: null, count: 0, reminderDue: false, lastError: null },
          hasVoted: false,
          votedAt: null,
          source: rows.length > 1 ? "import" : "manual",
          createdAt: now,
        });
      }
      batch.update(electionDoc(electionId), { "counts.voters": FieldValue.increment(chunk.length), updatedAt: now });
      await batch.commit();
    }
    report.added = toAdd.length;

    if (report.added > 0) await logAudit(electionId, actor, "voters.added", { count: report.added });
    refresh(electionId);
    return ok(report);
  });
}

export async function updateVoter(
  electionId: string,
  voterId: string,
  input: { email: string; name: string },
): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const blocked = assertEditable(election);
    if (blocked) return fail(blocked);
    const parsed = voterInputSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));

    const ref = votersCol(electionId).doc(voterId);
    const snap = await ref.get();
    if (!snap.exists) return fail("Voter not found.");
    const voter = snap.data() as Omit<Voter, "id">;
    if (voter.hasVoted) return fail("This voter has already voted and can't be edited.");

    const emailChanged = parsed.data.email !== voter.emailLower;
    if (emailChanged) {
      const clash = await votersCol(electionId).where("emailLower", "==", parsed.data.email).limit(1).get();
      if (!clash.empty) return fail("Another voter already uses that email.");
    }

    const batch = adminDb().batch();
    batch.update(ref, {
      name: parsed.data.name,
      ...(emailChanged
        ? {
            email: parsed.data.email,
            emailLower: parsed.data.email,
            tokenHash: null,
            codeHash: null,
            "invite.status": "notSent",
            "invite.reminderDue": false,
            "invite.lastError": null,
          }
        : {}),
    });
    const delta = emailChanged ? invitedDelta(voter.invite.status, "notSent") : 0;
    if (delta !== 0) batch.update(electionDoc(electionId), { "counts.invited": FieldValue.increment(delta) });
    await batch.commit();
    await logAudit(electionId, actor, "voters.updated", { emailChanged });
    refresh(electionId);
    return ok();
  });
}

export async function removeVoters(electionId: string, voterIds: string[]): Promise<ActionResult<{ removed: number }>> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const blocked = assertEditable(election);
    if (blocked) return fail(blocked);
    const ids = Array.from(new Set(voterIds)).slice(0, 500);
    if (ids.length === 0) return fail("Select at least one voter.");

    const db = adminDb();
    const snaps = await db.getAll(...ids.map((id) => votersCol(electionId).doc(id)));
    const removable = snaps.filter((s) => s.exists && !(s.data() as Voter).hasVoted);
    if (removable.length === 0) return fail("Voters who have already voted can't be removed.");

    const invitedRemoved = removable.filter((s) => invitedDelta((s.data() as Voter).invite.status, "notSent") < 0).length;
    const batch = db.batch();
    removable.forEach((s) => batch.delete(s.ref));
    batch.update(electionDoc(electionId), {
      "counts.voters": FieldValue.increment(-removable.length),
      "counts.invited": FieldValue.increment(-invitedRemoved),
      updatedAt: Date.now(),
    });
    await batch.commit();
    await logAudit(electionId, actor, "voters.removed", { count: removable.length });
    refresh(electionId);
    return ok({ removed: removable.length });
  });
}

export async function generatePrintSlips(electionId: string, voterIds: string[]): Promise<ActionResult<PrintSlip[]>> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const blocked = assertEditable(election);
    if (blocked) return fail(blocked);
    const ids = Array.from(new Set(voterIds)).slice(0, FREE_PLAN.votersPerElection);
    if (ids.length === 0) return fail("Select at least one voter.");

    const db = adminDb();
    const snaps = await db.getAll(...ids.map((id) => votersCol(electionId).doc(id)));
    const eligible = snaps.filter((s) => s.exists && !(s.data() as Voter).hasVoted);
    if (eligible.length === 0) return fail("Everyone selected has already voted.");

    const slips: PrintSlip[] = [];
    let invitedChange = 0;
    const batch = db.batch();
    for (const snap of eligible) {
      const voter = snap.data() as Voter;
      const creds = newCredentials(electionId);
      batch.update(snap.ref, {
        tokenHash: creds.tokenHash,
        codeHash: creds.codeHash,
        "invite.status": "printed",
        "invite.reminderDue": false,
        "invite.lastError": null,
      });
      invitedChange += invitedDelta(voter.invite.status, "printed");
      slips.push({
        name: voter.name,
        email: voter.email,
        code: formatCode(creds.code),
        link: appUrl(`/e/${election.slug}/vote?t=${encodeURIComponent(creds.token)}`),
      });
    }
    if (invitedChange !== 0) batch.update(electionDoc(electionId), { "counts.invited": FieldValue.increment(invitedChange) });
    await batch.commit();
    await logAudit(electionId, actor, "voters.slips_printed", { count: slips.length });
    refresh(electionId);
    return ok(slips);
  });
}
