import "server-only";
import { cache } from "react";
import { turnoutPercent } from "../../admin-metrics";
import { getEffectiveStatus } from "../../election-status";
import { adminAuth, adminDb } from "../../firebase-admin";
import { cleanOverrides, isCustomPlan, resolveLimits, type LimitOverrides, type PlanLimits } from "../../plans";
import type { AuditEntry, EffectiveStatus, Election, InviteStatus, Role, Voter } from "../../types";
import { electionDoc, electionsCol, getTally, toElection, votersCol } from "../elections";
import { userLimitOverrides } from "../limits";

export interface AdminElectionRow {
  id: string;
  title: string;
  slug: string;
  orgName: string;
  ownerId: string;
  ownerEmail: string;
  status: EffectiveStatus;
  startsAt: number;
  endsAt: number;
  createdAt: number;
  voters: number;
  invited: number;
  voted: number;
  turnout: number;
  customLimits: boolean;
}

export interface AdminElectionMember {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

export interface AdminElectionDetail {
  election: Election;
  status: EffectiveStatus;
  voted: number;
  turnout: number;
  members: AdminElectionMember[];
  invites: { id: string; email: string; role: string; expiresAt: number }[];
  inviteStats: Record<InviteStatus, number> & { reminderDue: number };
  failures: { voterId: string; email: string; error: string | null; sentAt: number | null }[];
  audit: AuditEntry[];
  limits: PlanLimits;
  electionOverrides: LimitOverrides;
  ownerOverrides: LimitOverrides;
}

const emailsByUid = cache(async (): Promise<Map<string, string>> => {
  const snap = await adminDb().collection("users").select("email").get();
  return new Map(snap.docs.map((d) => [d.id, (d.data().email as string | undefined) ?? ""]));
});

export const votedByElection = cache(async (): Promise<Map<string, number>> => {
  const snap = await adminDb().collectionGroup("tallies").select("total").get();
  const totals = new Map<string, number>();
  for (const doc of snap.docs) {
    const electionId = doc.ref.parent.parent?.id;
    if (!electionId) continue;
    totals.set(electionId, (totals.get(electionId) ?? 0) + ((doc.data().total as number | undefined) ?? 0));
  }
  return totals;
});

export const listAllElections = cache(async (): Promise<Election[]> => {
  const snap = await electionsCol().get();
  return snap.docs.map((d) => toElection(d.id, d.data())!);
});

export async function listAdminElections(): Promise<AdminElectionRow[]> {
  const [elections, voted, emails] = await Promise.all([listAllElections(), votedByElection(), emailsByUid()]);
  const now = Date.now();
  return elections
    .map((e) => {
      const count = voted.get(e.id) ?? 0;
      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        orgName: e.orgName,
        ownerId: e.ownerId,
        ownerEmail: emails.get(e.ownerId) ?? "",
        status: getEffectiveStatus(e, now),
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        createdAt: e.createdAt,
        voters: e.counts?.voters ?? 0,
        invited: e.counts?.invited ?? 0,
        voted: count,
        turnout: turnoutPercent(count, e.counts?.voters ?? 0),
        customLimits: isCustomPlan(resolveLimits(e.limits)),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function memberProfiles(uids: string[]): Promise<Map<string, { email: string; name: string }>> {
  const result = new Map<string, { email: string; name: string }>();
  if (uids.length === 0) return result;
  const { users } = await adminAuth().getUsers(uids.map((uid) => ({ uid })));
  for (const user of users) result.set(user.uid, { email: user.email ?? "", name: user.displayName ?? "" });
  const profiles = await adminDb().getAll(...uids.map((uid) => adminDb().collection("users").doc(uid)));
  for (const profile of profiles) {
    const name = profile.data()?.displayName as string | undefined;
    if (name && result.has(profile.id)) result.set(profile.id, { ...result.get(profile.id)!, name });
  }
  return result;
}

export async function getAdminElection(electionId: string): Promise<AdminElectionDetail | null> {
  if (!/^[A-Za-z0-9]{6,40}$/.test(electionId)) return null;
  const snap = await electionDoc(electionId).get();
  const election = toElection(snap.id, snap.data());
  if (!election) return null;

  const [tally, profiles, invitesSnap, votersSnap, failedSnap, auditSnap, ownerOverrides] = await Promise.all([
    getTally(electionId),
    memberProfiles(election.memberIds),
    adminDb().collection("teamInvites").where("electionId", "==", electionId).get(),
    votersCol(electionId).select("invite").get(),
    votersCol(electionId).where("invite.status", "==", "failed").limit(25).get(),
    electionDoc(electionId).collection("audit").orderBy("at", "desc").limit(50).get(),
    userLimitOverrides(election.ownerId),
  ]);

  const inviteStats = { notSent: 0, sent: 0, failed: 0, printed: 0, reminderDue: 0 };
  for (const doc of votersSnap.docs) {
    const invite = (doc.data() as Pick<Voter, "invite">).invite;
    inviteStats[invite.status] += 1;
    if (invite.reminderDue) inviteStats.reminderDue += 1;
  }

  const members = Object.entries(election.members)
    .map(([uid, role]) => ({ uid, role, email: profiles.get(uid)?.email ?? "", name: profiles.get(uid)?.name ?? "" }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.email.localeCompare(b.email)));

  const electionOverrides = cleanOverrides(election.limits);
  return {
    election,
    status: getEffectiveStatus(election),
    voted: tally.total,
    turnout: turnoutPercent(tally.total, election.counts.voters),
    members,
    invites: invitesSnap.docs.map((d) => ({
      id: d.id,
      email: d.data().email as string,
      role: d.data().role as string,
      expiresAt: d.data().expiresAt as number,
    })),
    inviteStats,
    failures: failedSnap.docs.map((d) => {
      const voter = d.data() as Voter;
      return { voterId: d.id, email: voter.email, error: voter.invite.lastError, sentAt: voter.invite.sentAt };
    }),
    audit: auditSnap.docs.map((d) => ({ ...(d.data() as Omit<AuditEntry, "id">), id: d.id })),
    limits: resolveLimits(ownerOverrides, electionOverrides),
    electionOverrides,
    ownerOverrides: cleanOverrides(ownerOverrides),
  };
}
