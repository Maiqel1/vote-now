"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "../../auth/superadmin";
import { adminDb } from "../../firebase-admin";
import { cleanOverrides } from "../../plans";
import type { ActionResult, Election, Role } from "../../types";
import { logAdminAction, type AdminTarget } from "../../server/admin-audit";
import { findUserByEmail } from "../../server/admin/users";
import { setAdminNote } from "../../server/admin/notes";
import { logAudit, SUPPORT_ACTOR } from "../../server/audit";
import {
  closeVotingOp,
  deleteElectionOp,
  extendVotingOp,
  publishResultsOp,
  refreshElection,
  setPausedOp,
} from "../../server/election-ops";
import { electionDoc, getElection } from "../../server/elections";
import { ActionError, fail, ok, run } from "../guard";

async function loadElection(electionId: string): Promise<Election> {
  const election = typeof electionId === "string" ? await getElection(electionId) : null;
  if (!election) throw new ActionError("Election not found.");
  return election;
}

function target(election: Election): AdminTarget {
  return { type: "election", id: election.id, label: election.title };
}

function refresh(election: Election) {
  refreshElection(election);
  revalidatePath(`/admin/elections/${election.id}`);
  revalidatePath("/admin/elections");
  revalidatePath("/admin");
}

async function profileFor(email: string) {
  const user = await findUserByEmail(String(email ?? ""));
  if (!user) throw new ActionError("No VoteNow account uses that email.");
  const profile = await adminDb().collection("users").doc(user.uid).get();
  if (!profile.exists) throw new ActionError("That person hasn't finished signing up yet.");
  if (user.disabled) throw new ActionError("That account is disabled.");
  return user;
}

export async function adminSetPaused(electionId: string, paused: boolean): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    await setPausedOp(election, SUPPORT_ACTOR, Boolean(paused));
    await logAdminAction(admin, paused ? "election.paused" : "election.resumed", target(election));
    refresh(election);
    return ok();
  });
}

export async function adminCloseVoting(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    await closeVotingOp(election, SUPPORT_ACTOR);
    await logAdminAction(admin, "election.closed", target(election));
    refresh(election);
    return ok();
  });
}

export async function adminExtendVoting(electionId: string, newEndsAt: number): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    await extendVotingOp(election, SUPPORT_ACTOR, Number(newEndsAt));
    await logAdminAction(admin, "election.extended", target(election), { from: election.endsAt, to: Number(newEndsAt) });
    refresh(election);
    return ok();
  });
}

export async function adminPublishResults(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    await publishResultsOp(election, SUPPORT_ACTOR);
    await logAdminAction(admin, "election.results_published", target(election));
    refresh(election);
    return ok();
  });
}

export async function adminTransferOwnership(electionId: string, newOwnerEmail: string, confirmTitle: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    if (String(confirmTitle ?? "").trim() !== election.title) return fail("Type the election title exactly to confirm.");
    const next = await profileFor(newOwnerEmail);
    if (next.uid === election.ownerId) return fail("That person already owns this election.");

    await electionDoc(election.id).update({
      ownerId: next.uid,
      [`members.${next.uid}`]: "owner",
      [`members.${election.ownerId}`]: "admin",
      memberIds: FieldValue.arrayUnion(next.uid),
      updatedAt: Date.now(),
    });
    await logAudit(election.id, SUPPORT_ACTOR, "team.ownership_transferred", { from: election.ownerId, to: next.email });
    await logAdminAction(admin, "election.ownership_transferred", target(election), { from: election.ownerId, to: next.uid, toEmail: next.email });
    refresh(election);
    return ok();
  });
}

export async function adminAddMember(electionId: string, email: string, role: Exclude<Role, "owner">): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    if (role !== "admin" && role !== "observer") return fail("Choose co-admin or observer.");
    const user = await profileFor(email);
    if (election.members[user.uid] === "owner") return fail("That person owns this election.");
    await electionDoc(election.id).update({
      [`members.${user.uid}`]: role,
      memberIds: FieldValue.arrayUnion(user.uid),
      updatedAt: Date.now(),
    });
    await logAudit(election.id, SUPPORT_ACTOR, "team.member_added", { uid: user.uid, email: user.email, role });
    await logAdminAction(admin, "election.member_added", target(election), { uid: user.uid, email: user.email, role });
    refresh(election);
    return ok();
  });
}

export async function adminRemoveMember(electionId: string, uid: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    if (!election.members[uid]) return fail("That person isn't on the team.");
    if (election.members[uid] === "owner") return fail("Transfer ownership before removing the owner.");
    await electionDoc(election.id).update({
      [`members.${uid}`]: FieldValue.delete(),
      memberIds: FieldValue.arrayRemove(uid),
      updatedAt: Date.now(),
    });
    await logAudit(election.id, SUPPORT_ACTOR, "team.removed", { uid });
    await logAdminAction(admin, "election.member_removed", target(election), { uid });
    refresh(election);
    return ok();
  });
}

export async function adminSetElectionLimits(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    const overrides = cleanOverrides(input);
    const empty = Object.keys(overrides).length === 0;
    await electionDoc(election.id).update({ limits: empty ? FieldValue.delete() : overrides, updatedAt: Date.now() });
    await logAudit(election.id, SUPPORT_ACTOR, "plan.limits_changed", { ...overrides });
    await logAdminAction(admin, empty ? "election.limits_reset" : "election.limits_changed", target(election), { ...overrides });
    refresh(election);
    return ok();
  });
}

export async function saveElectionNote(electionId: string, text: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    await setAdminNote("election", election.id, String(text ?? ""), admin.email);
    await logAdminAction(admin, "election.note_updated", target(election));
    revalidatePath(`/admin/elections/${election.id}`);
    return ok();
  });
}

export async function adminDeleteElection(electionId: string, confirmTitle: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const election = await loadElection(electionId);
    if (String(confirmTitle ?? "").trim() !== election.title) return fail("Type the election title exactly to confirm.");
    await deleteElectionOp(election);
    await adminDb().collection("adminNotes").doc(`election_${election.id}`).delete();
    await logAdminAction(admin, "election.deleted", target(election), { slug: election.slug, ownerId: election.ownerId });
    revalidatePath("/admin/elections");
    revalidatePath("/admin");
    return ok();
  });
}
