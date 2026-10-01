import "server-only";
import { adminDb } from "../firebase-admin";
import { sumShards } from "../results";
import type { Ballot, Election, Role, TallyShard, Voter } from "../types";

export const TALLY_SHARDS = 10;

const ROLE_RANK: Record<Role, number> = { observer: 0, admin: 1, owner: 2 };

export function hasRole(role: Role | undefined, minimum: Role): boolean {
  return role !== undefined && ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function electionsCol() {
  return adminDb().collection("elections");
}

export function electionDoc(electionId: string) {
  return electionsCol().doc(electionId);
}

export function ballotDoc(electionId: string) {
  return electionDoc(electionId).collection("ballot").doc("current");
}

export function votersCol(electionId: string) {
  return electionDoc(electionId).collection("voters");
}

export function talliesCol(electionId: string) {
  return electionDoc(electionId).collection("tallies");
}

export function ballotsCol(electionId: string) {
  return electionDoc(electionId).collection("ballots");
}

export function toElection(id: string, data: FirebaseFirestore.DocumentData | undefined): Election | null {
  if (!data) return null;
  return { ...(data as Omit<Election, "id">), id };
}

export function toVoter(id: string, data: FirebaseFirestore.DocumentData): Voter {
  return { ...(data as Omit<Voter, "id">), id };
}

export async function getElection(electionId: string): Promise<Election | null> {
  if (!/^[A-Za-z0-9]{6,40}$/.test(electionId)) return null;
  const snap = await electionDoc(electionId).get();
  return toElection(snap.id, snap.data());
}

export async function getElectionBySlug(slug: string): Promise<Election | null> {
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) return null;
  const slugSnap = await adminDb().collection("slugs").doc(slug).get();
  const electionId = slugSnap.data()?.electionId as string | undefined;
  if (!electionId) return null;
  return getElection(electionId);
}

export async function getBallot(electionId: string): Promise<Ballot> {
  const snap = await ballotDoc(electionId).get();
  return (snap.data() as Ballot | undefined) ?? { positions: [], updatedAt: 0 };
}

export async function getTally(electionId: string): Promise<TallyShard> {
  const snap = await talliesCol(electionId).get();
  return sumShards(snap.docs.map((d) => d.data() as TallyShard));
}

export async function getElectionAccess(
  electionId: string,
  uid: string,
  minimum: Role = "observer",
): Promise<{ election: Election; role: Role } | null> {
  const election = await getElection(electionId);
  if (!election) return null;
  const role = election.members[uid];
  if (!hasRole(role, minimum)) return null;
  return { election, role };
}

export async function countActiveElections(uid: string): Promise<number> {
  const snap = await electionsCol().where("ownerId", "==", uid).get();
  const now = Date.now();
  return snap.docs.filter((d) => (d.data().endsAt as number) > now).length;
}
