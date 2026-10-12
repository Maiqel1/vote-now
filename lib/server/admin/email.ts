import "server-only";
import { lastNDays, type DayCount } from "../../admin-metrics";
import { adminDb } from "../../firebase-admin";
import type { Voter } from "../../types";

const SHARDS = 10;

export interface InviteFailure {
  voterId: string;
  electionId: string;
  electionTitle: string;
  email: string;
  error: string | null;
  sentAt: number | null;
}

export async function emailUsageByDay(days: number): Promise<DayCount[]> {
  const db = adminDb();
  const keys = lastNDays(days);
  const refs = keys.flatMap((day) =>
    Array.from({ length: SHARDS }, (_, shard) => db.collection("emailUsage").doc(day).collection("shards").doc(String(shard))),
  );
  const snaps = await db.getAll(...refs);
  return keys.map((day, i) => ({
    day,
    count: snaps
      .slice(i * SHARDS, (i + 1) * SHARDS)
      .reduce((sum, snap) => sum + ((snap.data()?.count as number | undefined) ?? 0), 0),
  }));
}

export async function recentInviteFailures(limit = 20): Promise<InviteFailure[]> {
  const db = adminDb();
  const snap = await db.collectionGroup("voters").where("invite.status", "==", "failed").limit(200).get();
  const docs = snap.docs
    .map((d) => ({ doc: d, voter: d.data() as Voter }))
    .sort((a, b) => (b.voter.invite.sentAt ?? 0) - (a.voter.invite.sentAt ?? 0))
    .slice(0, limit);
  const electionIds = Array.from(new Set(docs.map(({ doc }) => doc.ref.parent.parent!.id)));
  const titles = new Map<string, string>();
  if (electionIds.length > 0) {
    const elections = await db.getAll(...electionIds.map((id) => db.collection("elections").doc(id)));
    elections.forEach((e) => titles.set(e.id, (e.data()?.title as string | undefined) ?? "Deleted election"));
  }
  return docs.map(({ doc, voter }) => {
    const electionId = doc.ref.parent.parent!.id;
    return {
      voterId: doc.id,
      electionId,
      electionTitle: titles.get(electionId) ?? "",
      email: voter.email,
      error: voter.invite.lastError,
      sentAt: voter.invite.sentAt,
    };
  });
}

export function emailConfig() {
  return {
    transport: process.env.EMAIL_TRANSPORT ?? "log",
    from: process.env.EMAIL_FROM ?? "VoteNow <noreply@vote-now.xyz>",
    allowlist: process.env.EMAIL_ALLOWLIST ?? "",
    smtpHost: process.env.SMTP_HOST ?? "",
    envCap: Number(process.env.EMAIL_DAILY_CAP ?? 250),
  };
}
