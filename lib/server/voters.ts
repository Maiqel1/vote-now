import "server-only";
import { adminDb } from "../firebase-admin";
import type { Voter, VoterRow } from "../types";
import { emailKeyOf } from "../voter-access";
import { votersCol } from "./elections";

const IN_QUERY_LIMIT = 30;

export async function existingEmailKeys(electionId: string, keys: string[]): Promise<Set<string>> {
  const unique = [...new Set(keys)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += IN_QUERY_LIMIT) chunks.push(unique.slice(i, i + IN_QUERY_LIMIT));
  const found = new Set<string>();
  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await votersCol(electionId).where("emailKey", "in", chunk).select("emailKey").get();
      for (const doc of snap.docs) found.add(doc.get("emailKey") as string);
    }),
  );
  return found;
}

export async function emailTaken(electionId: string, email: string, exceptVoterId?: string): Promise<boolean> {
  const snap = await votersCol(electionId).where("emailKey", "==", emailKeyOf(email)).limit(2).get();
  return snap.docs.some((doc) => doc.id !== exceptVoterId);
}

export async function findVoterByEmail(electionId: string, email: string) {
  const snap = await votersCol(electionId).where("emailKey", "==", emailKeyOf(email)).limit(1).get();
  return snap.empty ? null : snap.docs[0];
}

export type VoterFilter = "all" | "notInvited" | "invited" | "failed" | "voted" | "notVoted";

export const VOTER_FILTERS: VoterFilter[] = ["all", "notInvited", "invited", "failed", "voted", "notVoted"];

export function toVoterRow(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): VoterRow {
  const v = doc.data() as Voter;
  return {
    id: doc.id,
    email: v.email,
    name: v.name,
    inviteStatus: v.invite.status,
    sentAt: v.invite.sentAt,
    inviteCount: v.invite.count,
    lastError: v.invite.lastError,
    hasVoted: v.hasVoted,
    votedAt: v.votedAt,
  };
}

export async function queryVoters(
  electionId: string,
  options: { filter: VoterFilter; search: string; after: string | null; limit: number },
): Promise<{ rows: VoterRow[]; next: string | null }> {
  let query: FirebaseFirestore.Query = votersCol(electionId);
  if (options.filter === "notInvited") query = query.where("invite.status", "==", "notSent");
  if (options.filter === "invited") query = query.where("invite.status", "in", ["sent", "printed"]);
  if (options.filter === "failed") query = query.where("invite.status", "==", "failed");
  if (options.filter === "voted") query = query.where("hasVoted", "==", true);
  if (options.filter === "notVoted") query = query.where("hasVoted", "==", false);
  const prefix = options.search.trim().toLowerCase();
  if (prefix) query = query.where("emailLower", ">=", prefix).where("emailLower", "<", `${prefix}`);
  query = query.orderBy("emailLower");
  if (options.after) query = query.startAfter(options.after);
  const snap = await query.limit(options.limit + 1).get();
  const docs = snap.docs.slice(0, options.limit);
  return {
    rows: docs.map(toVoterRow),
    next: snap.docs.length > options.limit ? (docs.at(-1)?.get("emailLower") as string) : null,
  };
}

export async function ensureEmailKeys(electionId: string): Promise<number> {
  const snap = await votersCol(electionId).select("emailLower", "emailKey").get();
  const missing = snap.docs.filter((doc) => !doc.get("emailKey"));
  for (let i = 0; i < missing.length; i += 400) {
    const batch = adminDb().batch();
    for (const doc of missing.slice(i, i + 400)) batch.update(doc.ref, { emailKey: emailKeyOf(doc.get("emailLower") as string) });
    await batch.commit();
  }
  return missing.length;
}
