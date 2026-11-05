import "server-only";
import { AggregateField } from "firebase-admin/firestore";
import { DAY_MS } from "../../admin-metrics";
import { adminAuth, adminDb } from "../../firebase-admin";
import { pollEndsAt, pollStatus, toPoll, type Poll, type PollStatus } from "../../polls";
import { pollsCol, pollVoteTotal } from "../polls";

export interface AdminPollRow {
  code: string;
  title: string;
  status: PollStatus;
  strict: boolean;
  hiddenResults: boolean;
  questions: number;
  options: number;
  createdAt: number;
  endsAt: number;
  votes: number;
  reportCount: number;
  creatorEmail: string | null;
}

async function emailsByUid(uids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < uids.length; i += 100) {
    const result = await adminAuth().getUsers(uids.slice(i, i + 100).map((uid) => ({ uid })));
    for (const user of result.users) if (user.email) map.set(user.uid, user.email);
  }
  return map;
}

export async function listAdminPolls(limit = 300): Promise<AdminPollRow[]> {
  const snap = await pollsCol().orderBy("createdAt", "desc").limit(limit).get();
  const polls = snap.docs.map((d) => toPoll(d.id, d.data())).filter((p): p is Poll => p !== null);
  const creators = [...new Set(polls.map((p) => p.creatorUid).filter((uid): uid is string => Boolean(uid)))];
  const [totals, emails] = await Promise.all([Promise.all(polls.map((p) => pollVoteTotal(p.code))), emailsByUid(creators)]);
  const now = Date.now();
  return polls.map((poll, i) => ({
    code: poll.code,
    title: poll.title,
    status: pollStatus(poll, now),
    strict: poll.strict,
    hiddenResults: poll.resultsVisibility === "afterEnd",
    questions: poll.questions.length,
    options: poll.questions.reduce((sum, q) => sum + q.options.length, 0),
    createdAt: poll.createdAt,
    endsAt: pollEndsAt(poll),
    votes: totals[i],
    reportCount: poll.reportCount,
    creatorEmail: poll.creatorUid ? emails.get(poll.creatorUid) ?? null : null,
  }));
}

export interface PollStats {
  total: number;
  running: number;
  created24h: number;
  created7d: number;
  reported: number;
  votes: number;
}

export async function pollStats(): Promise<PollStats> {
  const now = Date.now();
  const col = pollsCol();
  const [total, created24h, created7d, reported, live, votes] = await Promise.all([
    col.count().get(),
    col.where("createdAt", ">=", now - DAY_MS).count().get(),
    col.where("createdAt", ">=", now - 7 * DAY_MS).count().get(),
    col.where("reportCount", ">", 0).count().get(),
    col.where("endsAt", ">", now).select("closedAt", "removedAt").get(),
    adminDb().collectionGroup("pollShards").aggregate({ votes: AggregateField.sum("total") }).get(),
  ]);
  return {
    total: total.data().count,
    running: live.docs.filter((d) => d.get("closedAt") == null && d.get("removedAt") == null).length,
    created24h: created24h.data().count,
    created7d: created7d.data().count,
    reported: reported.data().count,
    votes: votes.data().votes ?? 0,
  };
}
