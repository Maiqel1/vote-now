"use server";

import { revalidatePath } from "next/cache";
import { canPublishResultsManually, getEffectiveStatus } from "../election-status";
import { adminDb } from "../firebase-admin";
import { FREE_PLAN } from "../plans";
import { logAudit, logAuditIn } from "../server/audit";
import {
  ballotDoc,
  electionDoc,
  electionsCol,
  getBallot,
  votersCol,
} from "../server/elections";
import type { ActionResult, Election, ResultsVisibility } from "../types";
import {
  RESERVED_SLUGS,
  ballotOptionsSchema,
  ballotReadinessIssues,
  brandingSchema,
  createElectionSchema,
  electionDetailsSchema,
  scheduleSchema,
  slugSchema,
  visibilitySchema,
} from "../validation";
import { isAllowedImageUrl } from "../image-url";
import { copyImageToElection, deleteElectionImages } from "../server/cloudinary";
import { ActionError, actorOf, fail, ok, requireActionUser, requireElection, run, zodMessage } from "./guard";

class SlugTaken extends Error {}

function refresh(electionId: string) {
  revalidatePath(`/dashboard/e/${electionId}`, "layout");
  revalidatePath("/dashboard");
}

async function assertUnderActiveLimit(uid: string, excludeElectionId?: string) {
  const snap = await electionsCol().where("ownerId", "==", uid).get();
  const now = Date.now();
  const active = snap.docs.filter((d) => d.id !== excludeElectionId && (d.data().endsAt as number) > now).length;
  if (active >= FREE_PLAN.activeElections) {
    throw new ActionError(
      `The free plan allows ${FREE_PLAN.activeElections} active elections at a time. Delete a draft or wait for one to close.`,
    );
  }
}

export async function checkSlugAvailable(slug: string): Promise<ActionResult<{ available: boolean }>> {
  return run(async () => {
    await requireActionUser();
    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    if (RESERVED_SLUGS.has(parsed.data)) return ok({ available: false });
    const snap = await adminDb().collection("slugs").doc(parsed.data).get();
    return ok({ available: !snap.exists });
  });
}

export async function createElection(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const user = await requireActionUser();
    const parsed = createElectionSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const data = parsed.data;
    const schedule = scheduleSchema.safeParse(data);
    if (!schedule.success) return fail(zodMessage(schedule.error));
    if (RESERVED_SLUGS.has(data.slug)) return fail("That URL is reserved. Choose another.");
    await assertUnderActiveLimit(user.uid);

    const db = adminDb();
    const ref = electionsCol().doc();
    const now = Date.now();
    const election: Omit<Election, "id"> = {
      slug: data.slug,
      title: data.title,
      orgName: data.orgName,
      description: data.description,
      logoUrl: null,
      accentColor: null,
      ownerId: user.uid,
      members: { [user.uid]: "owner" },
      memberIds: [user.uid],
      status: "draft",
      paused: false,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      timezone: data.timezone,
      results: { visibility: data.visibility, publishedAt: null },
      ballotOptions: { shuffle: false, requireAll: false },
      lockedAt: null,
      reminderRound: 0,
      inviteMessage: "",
      counts: { voters: 0, invited: 0 },
      piiPurgedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.runTransaction(async (tx) => {
        const slugRef = db.collection("slugs").doc(data.slug);
        if ((await tx.get(slugRef)).exists) throw new SlugTaken();
        tx.create(slugRef, { electionId: ref.id });
        tx.create(ref, election);
        tx.create(ballotDoc(ref.id), { positions: [], updatedAt: now });
        logAuditIn(tx, ref.id, actorOf(user), "election.created", { title: data.title });
      });
    } catch (error) {
      if (error instanceof SlugTaken) return fail("That URL is already taken. Choose another.");
      throw error;
    }

    revalidatePath("/dashboard");
    return ok({ id: ref.id });
  });
}

export async function updateDetails(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const parsed = electionDetailsSchema.extend({ slug: slugSchema }).safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const { slug, ...details } = parsed.data;
    const db = adminDb();

    if (slug !== election.slug) {
      if (election.status !== "draft") return fail("The public URL can only be changed while the election is a draft.");
      if (RESERVED_SLUGS.has(slug)) return fail("That URL is reserved. Choose another.");
      try {
        await db.runTransaction(async (tx) => {
          const newRef = db.collection("slugs").doc(slug);
          if ((await tx.get(newRef)).exists) throw new SlugTaken();
          tx.create(newRef, { electionId });
          tx.delete(db.collection("slugs").doc(election.slug));
          tx.update(electionDoc(electionId), { ...details, slug, updatedAt: Date.now() });
          logAuditIn(tx, electionId, actor, "election.details_updated", { slug });
        });
      } catch (error) {
        if (error instanceof SlugTaken) return fail("That URL is already taken. Choose another.");
        throw error;
      }
    } else {
      await electionDoc(electionId).update({ ...details, updatedAt: Date.now() });
      await logAudit(electionId, actor, "election.details_updated");
    }
    refresh(electionId);
    return ok();
  });
}

export async function updateSchedule(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const status = getEffectiveStatus(election);
    if (status !== "draft" && status !== "scheduled") {
      return fail("Voting has started. Use “Extend voting” to change the closing time.");
    }
    const parsed = scheduleSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    if (election.status === "published" && parsed.data.endsAt <= Date.now()) {
      return fail("The closing time must be in the future.");
    }
    await electionDoc(electionId).update({ ...parsed.data, updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.schedule_updated", {
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
    });
    refresh(electionId);
    return ok();
  });
}

export async function updateResultsVisibility(electionId: string, visibility: ResultsVisibility): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const parsed = visibilitySchema.safeParse(visibility);
    if (!parsed.success) return fail("Invalid option");
    if (election.results.publishedAt !== null) return fail("Results have already been published.");
    await electionDoc(electionId).update({ "results.visibility": parsed.data, updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.visibility_updated", { visibility: parsed.data });
    refresh(electionId);
    return ok();
  });
}

export async function updateBallotOptions(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const status = getEffectiveStatus(election);
    if (status !== "draft" && status !== "scheduled") return fail("Ballot options are locked once voting starts.");
    const parsed = ballotOptionsSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid options");
    await electionDoc(electionId).update({ ballotOptions: parsed.data, updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.ballot_options_updated", parsed.data);
    refresh(electionId);
    return ok();
  });
}

export async function updateBranding(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireElection(electionId, "admin");
    const parsed = brandingSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid branding");
    if (parsed.data.logoUrl && !isAllowedImageUrl(parsed.data.logoUrl)) return fail("Upload the logo using the upload button.");
    await electionDoc(electionId).update({ ...parsed.data, updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.branding_updated");
    refresh(electionId);
    return ok();
  });
}

export async function publishElection(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    if (election.status === "published") return fail("This election is already published.");
    const ballot = await getBallot(electionId);
    const issues = ballotReadinessIssues(ballot);
    if (issues.length > 0) return fail(issues[0]);
    if (election.counts.voters === 0) return fail("Add at least one voter before publishing.");
    if (election.endsAt <= Date.now() + 5 * 60 * 1000) return fail("Set a closing time at least 5 minutes from now.");
    await assertUnderActiveLimit(election.ownerId, electionId);
    await electionDoc(electionId).update({ status: "published", paused: false, updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.published");
    refresh(electionId);
    return ok();
  });
}

export async function unpublishElection(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    if (getEffectiveStatus(election) !== "scheduled") return fail("Only elections that haven't started can be unpublished.");
    await electionDoc(electionId).update({ status: "draft", updatedAt: Date.now() });
    await logAudit(electionId, actor, "election.unpublished");
    refresh(electionId);
    return ok();
  });
}

export async function setPaused(electionId: string, paused: boolean): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const status = getEffectiveStatus(election);
    if (paused && status !== "open") return fail("Voting isn't open.");
    if (!paused && status !== "paused") return fail("Voting isn't paused.");
    await electionDoc(electionId).update({ paused, updatedAt: Date.now() });
    await logAudit(electionId, actor, paused ? "voting.paused" : "voting.resumed");
    refresh(electionId);
    return ok();
  });
}

export async function closeVotingEarly(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const status = getEffectiveStatus(election);
    if (status !== "open" && status !== "paused") return fail("Voting isn't open.");
    const now = Date.now();
    await electionDoc(electionId).update({
      endsAt: now,
      paused: false,
      lockedAt: election.lockedAt ?? now,
      updatedAt: now,
    });
    await logAudit(electionId, actor, "voting.closed_early", { originalEndsAt: election.endsAt });
    refresh(electionId);
    return ok();
  });
}

export async function extendVoting(electionId: string, newEndsAt: number): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    const status = getEffectiveStatus(election);
    if (status !== "open" && status !== "paused") return fail("Voting can only be extended while it's open.");
    if (!Number.isFinite(newEndsAt) || newEndsAt <= election.endsAt) return fail("Choose a later closing time.");
    if (newEndsAt - election.startsAt > 1000 * 60 * 60 * 24 * 31) return fail("Voting can stay open for at most 31 days.");
    await electionDoc(electionId).update({ endsAt: newEndsAt, updatedAt: Date.now() });
    await logAudit(electionId, actor, "voting.extended", { from: election.endsAt, to: newEndsAt });
    refresh(electionId);
    return ok();
  });
}

export async function publishResults(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    if (!canPublishResultsManually(election)) return fail("Results can be published once voting has closed.");
    await electionDoc(electionId).update({ "results.publishedAt": Date.now(), updatedAt: Date.now() });
    await logAudit(electionId, actor, "results.published");
    refresh(electionId);
    revalidatePath(`/e/${election.slug}`, "layout");
    return ok();
  });
}

export async function duplicateElection(electionId: string, copyVoters: boolean): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { election, user, actor } = await requireElection(electionId, "admin");
    await assertUnderActiveLimit(user.uid);
    const db = adminDb();
    const ballot = await getBallot(electionId);
    const ref = electionsCol().doc();
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;
    const duration = Math.min(Math.max(election.endsAt - election.startsAt, 60 * 60 * 1000), 31 * day);

    let slug = "";
    for (let i = 0; i < 20 && !slug; i++) {
      const candidate = `${election.slug.slice(0, 42)}-${i === 0 ? "copy" : `copy-${i + 1}`}`;
      if (!(await db.collection("slugs").doc(candidate).get()).exists) slug = candidate;
    }
    if (!slug) return fail("Couldn't find a free URL for the copy.");

    const voterDocs = copyVoters && election.piiPurgedAt === null ? (await votersCol(electionId).get()).docs : [];
    const positions = await Promise.all(
      ballot.positions.map(async (position) => ({
        ...position,
        candidates: await Promise.all(
          position.candidates.map(async (candidate) => ({
            ...candidate,
            photoUrl: await copyImageToElection(candidate.photoUrl, ref.id, "candidates"),
          })),
        ),
      })),
    );
    const logoUrl = await copyImageToElection(election.logoUrl, ref.id, "branding");
    const copy: Omit<Election, "id"> = {
      ...election,
      slug,
      logoUrl,
      title: `${election.title} (copy)`.slice(0, 120),
      ownerId: user.uid,
      members: { [user.uid]: "owner" },
      memberIds: [user.uid],
      status: "draft",
      paused: false,
      startsAt: now + day,
      endsAt: now + day + duration,
      results: { visibility: election.results.visibility, publishedAt: null },
      lockedAt: null,
      reminderRound: 0,
      counts: { voters: voterDocs.length, invited: 0 },
      piiPurgedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    delete (copy as Partial<Election>).id;

    await db.runTransaction(async (tx) => {
      const slugRef = db.collection("slugs").doc(slug);
      if ((await tx.get(slugRef)).exists) throw new ActionError("URL conflict, please try again.");
      tx.create(slugRef, { electionId: ref.id });
      tx.create(ref, copy);
      tx.create(ballotDoc(ref.id), { positions, updatedAt: now });
      logAuditIn(tx, ref.id, actor, "election.created", { duplicatedFrom: electionId });
    });

    for (let i = 0; i < voterDocs.length; i += 400) {
      const batch = db.batch();
      for (const d of voterDocs.slice(i, i + 400)) {
        const v = d.data();
        batch.set(votersCol(ref.id).doc(), {
          email: v.email,
          emailLower: v.emailLower,
          name: v.name,
          tokenHash: null,
          codeHash: null,
          invite: { status: "notSent", sentAt: null, count: 0, reminderDue: false, lastError: null },
          hasVoted: false,
          votedAt: null,
          source: "import",
          createdAt: now,
        });
      }
      await batch.commit();
    }

    revalidatePath("/dashboard");
    return ok({ id: ref.id });
  });
}

export async function purgeVoterData(electionId: string): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "owner");
    if (getEffectiveStatus(election) !== "closed") return fail("Voter data can only be deleted after voting closes.");
    const db = adminDb();
    const snap = await votersCol(electionId).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    await electionDoc(electionId).update({ piiPurgedAt: Date.now(), updatedAt: Date.now() });
    await logAudit(electionId, actor, "voters.purged", { count: snap.size });
    refresh(electionId);
    return ok();
  });
}

export async function deleteElection(electionId: string, confirmTitle: string): Promise<ActionResult> {
  return run(async () => {
    const { election } = await requireElection(electionId, "owner");
    if (confirmTitle.trim() !== election.title) return fail("Type the election title exactly to confirm.");
    const db = adminDb();
    await db.recursiveDelete(electionDoc(electionId));
    await db.collection("slugs").doc(election.slug).delete();
    const invites = await db.collection("teamInvites").where("electionId", "==", electionId).get();
    await Promise.all(invites.docs.map((d) => d.ref.delete()));
    await deleteElectionImages(electionId);
    revalidatePath("/dashboard");
    return ok();
  });
}
