"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isEmailVerified } from "../auth/session";
import { hashToken, randomToken } from "../crypto";
import { sendEmail } from "../email";
import { teamInviteEmail } from "../email/templates";
import { adminDb } from "../firebase-admin";
import { logAudit, logAuditIn } from "../server/audit";
import { reserveEmails } from "../server/email-quota";
import { electionDoc, getElection } from "../server/elections";
import type { ActionResult, Role } from "../types";
import { ActionError, actorOf, fail, ok, requireActionUser, requireElection, run, zodMessage } from "./guard";

const MAX_TEAM = 10;
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  role: z.enum(["admin", "observer"]),
});

function teamInvites() {
  return adminDb().collection("teamInvites");
}

export async function inviteTeamMember(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { election, user, actor } = await requireElection(electionId, "owner");
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const { email, role } = parsed.data;

    const pending = await teamInvites().where("electionId", "==", electionId).get();
    if (election.memberIds.length + pending.size >= MAX_TEAM) return fail(`Teams are limited to ${MAX_TEAM} people.`);
    if (pending.docs.some((d) => d.data().email === email)) return fail("That person already has a pending invitation.");

    const profiles = await adminDb().getAll(...election.memberIds.map((uid) => adminDb().collection("users").doc(uid)));
    if (profiles.some((p) => (p.data()?.email as string | undefined)?.toLowerCase() === email)) {
      return fail("That person is already on the team.");
    }
    if (!(await isEmailVerified(user.uid))) return fail("Verify your email address before inviting people.");
    if ((await reserveEmails(1)) === 0) return fail("The platform's daily email limit has been reached. Try again tomorrow.");

    const token = randomToken();
    const now = Date.now();
    await teamInvites().doc(hashToken(token)).set({
      electionId,
      email,
      role,
      invitedBy: user.uid,
      expiresAt: now + INVITE_TTL_MS,
      createdAt: now,
    });
    const message = teamInviteEmail({ election, inviterName: actor.name, role, token });
    await sendEmail({ to: email, ...message, replyTo: user.email, fromName: `${actor.name} via VoteNow` });
    await logAudit(electionId, actor, "team.invited", { email, role });
    revalidatePath(`/dashboard/e/${electionId}/settings`);
    return ok();
  });
}

export async function revokeTeamInvite(electionId: string, inviteId: string): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireElection(electionId, "owner");
    const ref = teamInvites().doc(inviteId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.electionId !== electionId) return fail("Invitation not found.");
    await ref.delete();
    await logAudit(electionId, actor, "team.invite_revoked", { email: snap.data()?.email });
    revalidatePath(`/dashboard/e/${electionId}/settings`);
    return ok();
  });
}

export async function changeMemberRole(electionId: string, uid: string, role: Exclude<Role, "owner">): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "owner");
    if (!["admin", "observer"].includes(role)) return fail("Invalid role.");
    if (!election.members[uid] || election.members[uid] === "owner") return fail("You can't change that member's role.");
    await electionDoc(electionId).update({ [`members.${uid}`]: role, updatedAt: Date.now() });
    await logAudit(electionId, actor, "team.role_changed", { uid, role });
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    return ok();
  });
}

export async function removeMember(electionId: string, uid: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireActionUser();
    const election = await getElection(electionId);
    if (!election || !election.members[user.uid]) return fail("Not found.");
    const self = uid === user.uid;
    if (!self && election.members[user.uid] !== "owner") return fail("Only the owner can remove people.");
    if (election.members[uid] === "owner") return fail("The owner can't be removed.");
    if (!election.members[uid]) return fail("That person isn't on the team.");

    await electionDoc(electionId).update({
      [`members.${uid}`]: FieldValue.delete(),
      memberIds: FieldValue.arrayRemove(uid),
      updatedAt: Date.now(),
    });
    await logAudit(electionId, actorOf(user), self ? "team.left" : "team.removed", { uid });
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    revalidatePath("/dashboard");
    return ok();
  });
}

export async function acceptTeamInvite(token: string): Promise<ActionResult<{ electionId: string }>> {
  return run(async () => {
    const user = await requireActionUser();
    const db = adminDb();
    const ref = teamInvites().doc(hashToken(String(token ?? "")));
    if (!(await isEmailVerified(user.uid))) return fail("Verify your email address first, then open the invitation again.");

    const electionId = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new ActionError("This invitation is invalid or has already been used.");
      const invite = snap.data() as { electionId: string; email: string; role: Role; expiresAt: number };
      if (invite.expiresAt < Date.now()) throw new ActionError("This invitation has expired. Ask for a new one.");
      if (invite.email !== user.email.toLowerCase()) {
        throw new ActionError(`This invitation was sent to ${invite.email}. Log in with that email to accept it.`);
      }
      const electionRef = electionDoc(invite.electionId);
      const electionSnap = await tx.get(electionRef);
      if (!electionSnap.exists) throw new ActionError("This election no longer exists.");
      const members = (electionSnap.data()?.members ?? {}) as Record<string, Role>;
      if (!members[user.uid]) {
        tx.update(electionRef, {
          [`members.${user.uid}`]: invite.role,
          memberIds: FieldValue.arrayUnion(user.uid),
          updatedAt: Date.now(),
        });
      }
      tx.delete(ref);
      logAuditIn(tx, invite.electionId, actorOf(user), "team.joined", { role: invite.role });
      return invite.electionId;
    });

    revalidatePath("/dashboard");
    return ok({ electionId });
  });
}

export async function updateDisplayName(name: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireActionUser();
    const trimmed = String(name ?? "").trim();
    if (trimmed.length < 2 || trimmed.length > 80) return fail("Use 2–80 characters.");
    await adminDb().collection("users").doc(user.uid).set({ displayName: trimmed }, { merge: true });
    revalidatePath("/dashboard", "layout");
    return ok();
  });
}
