import "server-only";
import { randomInt } from "crypto";
import { AggregateField, FieldValue, Timestamp } from "firebase-admin/firestore";
import { sha256 } from "../crypto";
import { adminDb } from "../firebase-admin";
import {
  isPollCode,
  POLL_KEY_GRACE_MS,
  POLL_SHARDS,
  pollEndsAt,
  sumPollShards,
  toPoll,
  type Poll,
  type PollChoices,
  type PollResults,
} from "../polls";

export class DuplicateVote extends Error {}

export function pollsCol() {
  return adminDb().collection("polls");
}

export function pollDoc(code: string) {
  return pollsCol().doc(code);
}

export function pollShardsCol(code: string) {
  return pollDoc(code).collection("pollShards");
}

export function pollVoteKeysCol(code: string) {
  return pollDoc(code).collection("voteKeys");
}

export function hashVoteKey(key: string): string {
  return sha256(`poll-vote:${key}`);
}

export async function getPoll(code: string): Promise<Poll | null> {
  if (!isPollCode(code)) return null;
  const snap = await pollDoc(code).get();
  return snap.exists ? toPoll(code, snap.data()) : null;
}

export async function getPollResults(code: string): Promise<PollResults> {
  const snap = await pollShardsCol(code).get();
  return sumPollShards(snap.docs.map((d) => d.data()));
}

export async function pollVoteTotal(code: string): Promise<number> {
  const snap = await pollShardsCol(code).aggregate({ total: AggregateField.sum("total") }).get();
  return snap.data().total ?? 0;
}

export async function anyVoteKeyUsed(code: string, keys: string[]): Promise<boolean> {
  if (keys.length === 0) return false;
  const snaps = await adminDb().getAll(...keys.map((key) => pollVoteKeysCol(code).doc(hashVoteKey(key))));
  return snaps.some((snap) => snap.exists);
}

export async function recordPollVote(poll: Poll, choices: PollChoices, keys: string[]): Promise<void> {
  const batch = adminDb().batch();
  const expiresAt = Timestamp.fromMillis(pollEndsAt(poll) + POLL_KEY_GRACE_MS);
  for (const key of new Set(keys)) batch.create(pollVoteKeysCol(poll.code).doc(hashVoteKey(key)), { expiresAt });
  const counts = Object.fromEntries(
    Object.entries(choices).map(([questionId, picked]) => [questionId, Object.fromEntries(picked.map((id) => [id, FieldValue.increment(1)]))]),
  );
  const answered = Object.fromEntries(Object.keys(choices).map((questionId) => [questionId, FieldValue.increment(1)]));
  batch.set(
    pollShardsCol(poll.code).doc(String(randomInt(POLL_SHARDS))),
    { counts, answered, total: FieldValue.increment(1) },
    { merge: true },
  );
  try {
    await batch.commit();
  } catch (error) {
    if ((error as { code?: number }).code === 6) throw new DuplicateVote();
    throw error;
  }
}

export async function deletePollData(code: string): Promise<void> {
  await adminDb().recursiveDelete(pollDoc(code));
}
