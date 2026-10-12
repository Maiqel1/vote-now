import "server-only";
import { revalidatePath } from "next/cache";
import { ActionError } from "../actions/guard";
import { canPublishResultsManually, getEffectiveStatus } from "../election-status";
import { adminDb } from "../firebase-admin";
import type { Election } from "../types";
import { logAudit, type Actor } from "./audit";
import { deleteElectionImages } from "./cloudinary";
import { electionDoc } from "./elections";
import { getPlatformConfig } from "./platform-config";

const MAX_OPEN_MS = 1000 * 60 * 60 * 24 * 31;

export function refreshElection(election: Pick<Election, "id" | "slug">) {
  revalidatePath(`/dashboard/e/${election.id}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath(`/e/${election.slug}`, "layout");
}

export async function assertElectionsOpen() {
  if (!(await getPlatformConfig()).electionsOpen) {
    throw new ActionError("Creating new elections is paused right now. Please try again later.");
  }
}

export async function setPausedOp(election: Election, actor: Actor, paused: boolean) {
  const status = getEffectiveStatus(election);
  if (paused && status !== "open") throw new ActionError("Voting isn't open.");
  if (!paused && status !== "paused") throw new ActionError("Voting isn't paused.");
  await electionDoc(election.id).update({ paused, updatedAt: Date.now() });
  await logAudit(election.id, actor, paused ? "voting.paused" : "voting.resumed");
}

export async function closeVotingOp(election: Election, actor: Actor) {
  const status = getEffectiveStatus(election);
  if (status !== "open" && status !== "paused") throw new ActionError("Voting isn't open.");
  const now = Date.now();
  await electionDoc(election.id).update({
    endsAt: now,
    paused: false,
    lockedAt: election.lockedAt ?? now,
    updatedAt: now,
  });
  await logAudit(election.id, actor, "voting.closed_early", { originalEndsAt: election.endsAt });
}

export async function extendVotingOp(election: Election, actor: Actor, newEndsAt: number) {
  const status = getEffectiveStatus(election);
  if (status !== "open" && status !== "paused") throw new ActionError("Voting can only be extended while it's open.");
  if (!Number.isFinite(newEndsAt) || newEndsAt <= election.endsAt) throw new ActionError("Choose a later closing time.");
  if (newEndsAt - election.startsAt > MAX_OPEN_MS) throw new ActionError("Voting can stay open for at most 31 days.");
  await electionDoc(election.id).update({ endsAt: newEndsAt, updatedAt: Date.now() });
  await logAudit(election.id, actor, "voting.extended", { from: election.endsAt, to: newEndsAt });
}

export async function publishResultsOp(election: Election, actor: Actor) {
  if (!canPublishResultsManually(election)) throw new ActionError("Results can be published once voting has closed.");
  await electionDoc(election.id).update({ "results.publishedAt": Date.now(), updatedAt: Date.now() });
  await logAudit(election.id, actor, "results.published");
}

export async function deleteElectionOp(election: Election) {
  const db = adminDb();
  await db.recursiveDelete(electionDoc(election.id));
  await db.collection("slugs").doc(election.slug).delete();
  const invites = await db.collection("teamInvites").where("electionId", "==", election.id).get();
  await Promise.all(invites.docs.map((d) => d.ref.delete()));
  await deleteElectionImages(election.id);
  revalidatePath("/dashboard");
}
