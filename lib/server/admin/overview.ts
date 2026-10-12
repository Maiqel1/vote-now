import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { average, bucketByDay, countSince, DAY_MS, statusBreakdown, type DayCount } from "../../admin-metrics";
import { getEffectiveStatus } from "../../election-status";
import { adminDb } from "../../firebase-admin";
import { resolveLimits, type LimitOverrides } from "../../plans";
import { RATE_KIND_LABELS } from "../../rate-limit-keys";
import type { EffectiveStatus } from "../../types";
import { dailyEmailCap, usedToday } from "../email-quota";
import { MAX_RATE_WINDOW_MS, rateLimitsCol } from "../rate-limit";
import { emailUsageByDay } from "./email";
import { listAdminElections, listAllElections, votedByElection, type AdminElectionRow } from "./elections";
import { listAdminUsers, type AdminUser } from "./users";

export interface UserStats {
  total: number;
  new24h: number;
  new7d: number;
  new30d: number;
  active7d: number;
  active30d: number;
  unverified: number;
  disabled: number;
  signups: DayCount[];
  recent: AdminUser[];
}

export async function userStats(): Promise<UserStats> {
  const users = await listAdminUsers();
  const now = Date.now();
  const created = users.map((u) => u.createdAt);
  const active = users.map((u) => u.lastActiveAt ?? 0);
  return {
    total: users.length,
    new24h: countSince(created, now - DAY_MS),
    new7d: countSince(created, now - 7 * DAY_MS),
    new30d: countSince(created, now - 30 * DAY_MS),
    active7d: countSince(active, now - 7 * DAY_MS),
    active30d: countSince(active, now - 30 * DAY_MS),
    unverified: users.filter((u) => !u.emailVerified).length,
    disabled: users.filter((u) => u.disabled).length,
    signups: bucketByDay(created, 30, now),
    recent: users.slice(0, 8),
  };
}

export interface ElectionStats {
  total: number;
  byStatus: Record<EffectiveStatus, number>;
  createdLast30d: number;
  live: AdminElectionRow[];
  closingSoon: AdminElectionRow[];
  startingSoon: AdminElectionRow[];
}

export async function electionStats(): Promise<ElectionStats> {
  const [elections, rows] = await Promise.all([listAllElections(), listAdminElections()]);
  const now = Date.now();
  return {
    total: elections.length,
    byStatus: statusBreakdown(elections, now),
    createdLast30d: countSince(
      elections.map((e) => e.createdAt),
      now - 30 * DAY_MS,
    ),
    live: rows.filter((r) => r.status === "open" || r.status === "paused").sort((a, b) => a.endsAt - b.endsAt),
    closingSoon: rows
      .filter((r) => (r.status === "open" || r.status === "paused") && r.endsAt - now < DAY_MS)
      .sort((a, b) => a.endsAt - b.endsAt),
    startingSoon: rows
      .filter((r) => r.status === "scheduled" && r.startsAt - now < DAY_MS)
      .sort((a, b) => a.startsAt - b.startsAt),
  };
}

export interface VotingStats {
  voters: number;
  votes: number;
  votes24h: number;
  averageTurnoutClosed: number | null;
  votesByDay: DayCount[];
}

export async function votingStats(): Promise<VotingStats> {
  const now = Date.now();
  const [elections, voted, recent] = await Promise.all([
    listAllElections(),
    votedByElection(),
    adminDb()
      .collectionGroup("voters")
      .where("votedAt", ">=", now - 14 * DAY_MS)
      .select("votedAt")
      .get(),
  ]);
  const times = recent.docs.map((d) => d.data().votedAt as number);
  const closedTurnouts = elections
    .filter((e) => getEffectiveStatus(e, now) === "closed" && (e.counts?.voters ?? 0) > 0)
    .map((e) => ((voted.get(e.id) ?? 0) / e.counts.voters) * 100);
  return {
    voters: elections.reduce((sum, e) => sum + (e.counts?.voters ?? 0), 0),
    votes: Array.from(voted.values()).reduce((a, b) => a + b, 0),
    votes24h: countSince(times, now - DAY_MS),
    averageTurnoutClosed: average(closedTurnouts),
    votesByDay: bucketByDay(times, 14, now),
  };
}

export interface EmailStats {
  today: number;
  cap: number;
  byDay: DayCount[];
}

export async function emailStats(): Promise<EmailStats> {
  const [today, cap, byDay] = await Promise.all([usedToday(), dailyEmailCap(), emailUsageByDay(14)]);
  return { today, cap, byDay };
}

export interface BlockStat {
  kind: string;
  label: string;
  blocked: number;
  tracking: number;
}

export async function blockStats(): Promise<BlockStat[]> {
  const now = Date.now();
  const snap = await rateLimitsCol()
    .where("windowStart", ">=", now - MAX_RATE_WINDOW_MS)
    .get();
  const byKind = new Map<string, BlockStat>();
  for (const doc of snap.docs) {
    const data = doc.data() as { kind?: string; count?: number; limit?: number; expiresAt?: Timestamp };
    if ((data.expiresAt?.toMillis() ?? 0) <= now) continue;
    const kind = data.kind ?? "unknown";
    const stat = byKind.get(kind) ?? { kind, label: RATE_KIND_LABELS[kind] ?? "Older records", blocked: 0, tracking: 0 };
    stat.tracking += 1;
    if (typeof data.limit === "number" && (data.count ?? 0) >= data.limit) stat.blocked += 1;
    byKind.set(kind, stat);
  }
  return Array.from(byKind.values()).sort((a, b) => b.blocked - a.blocked || b.tracking - a.tracking);
}

export interface LimitPressure {
  owners: { uid: string; email: string; active: number; limit: number }[];
  fullElections: (AdminElectionRow & { limit: number })[];
}

export async function limitPressure(): Promise<LimitPressure> {
  const [elections, rows, profiles] = await Promise.all([
    listAllElections(),
    listAdminElections(),
    adminDb().collection("users").select("email", "limits").get(),
  ]);
  const now = Date.now();
  const overrides = new Map(profiles.docs.map((d) => [d.id, d.data().limits as LimitOverrides | undefined]));
  const emails = new Map(profiles.docs.map((d) => [d.id, (d.data().email as string | undefined) ?? ""]));
  const activeByOwner = new Map<string, number>();
  for (const e of elections) if (e.endsAt > now) activeByOwner.set(e.ownerId, (activeByOwner.get(e.ownerId) ?? 0) + 1);

  const owners = Array.from(activeByOwner.entries())
    .map(([uid, active]) => ({ uid, email: emails.get(uid) ?? "", active, limit: resolveLimits(overrides.get(uid)).activeElections }))
    .filter((o) => o.active >= o.limit)
    .sort((a, b) => b.active - a.active);

  const byId = new Map(elections.map((e) => [e.id, e]));
  const fullElections = rows
    .filter((r) => r.status !== "closed")
    .map((r) => ({ ...r, limit: resolveLimits(overrides.get(r.ownerId), byId.get(r.id)?.limits).votersPerElection }))
    .filter((r) => r.voters >= r.limit);

  return { owners, fullElections };
}
