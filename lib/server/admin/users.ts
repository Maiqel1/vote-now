import "server-only";
import type { UserRecord } from "firebase-admin/auth";
import { cache } from "react";
import { getEffectiveStatus } from "../../election-status";
import { adminAuth, adminDb } from "../../firebase-admin";
import { cleanOverrides, type LimitOverrides } from "../../plans";
import type { EffectiveStatus, Role } from "../../types";
import { electionsCol } from "../elections";

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  disabled: boolean;
  providers: string[];
  createdAt: number;
  lastSignInAt: number | null;
  lastActiveAt: number | null;
  hasProfile: boolean;
  limits: LimitOverrides;
  owned: number;
  member: number;
}

export interface AdminUserElection {
  id: string;
  title: string;
  orgName: string;
  role: Role;
  status: EffectiveStatus;
  voters: number;
  endsAt: number;
}

function parseTime(value: string | undefined | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export const listAuthUsers = cache(async (): Promise<UserRecord[]> => {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken && users.length < 50000);
  return users;
});

const userProfiles = cache(async () => {
  const snap = await adminDb().collection("users").select("displayName", "createdAt", "limits").get();
  return new Map(snap.docs.map((d) => [d.id, d.data() as { displayName?: string; createdAt?: number; limits?: unknown }]));
});

const membershipCounts = cache(async () => {
  const snap = await electionsCol().select("ownerId", "memberIds").get();
  const owned = new Map<string, number>();
  const member = new Map<string, number>();
  for (const doc of snap.docs) {
    const { ownerId, memberIds } = doc.data() as { ownerId: string; memberIds: string[] };
    owned.set(ownerId, (owned.get(ownerId) ?? 0) + 1);
    for (const uid of memberIds ?? []) if (uid !== ownerId) member.set(uid, (member.get(uid) ?? 0) + 1);
  }
  return { owned, member };
});

function toAdminUser(
  record: UserRecord,
  profile: { displayName?: string; createdAt?: number; limits?: unknown } | undefined,
  counts: { owned: Map<string, number>; member: Map<string, number> },
): AdminUser {
  const lastSignInAt = parseTime(record.metadata.lastSignInTime);
  const lastRefreshAt = parseTime(record.metadata.lastRefreshTime);
  return {
    uid: record.uid,
    email: record.email ?? "",
    name: profile?.displayName || record.displayName || "",
    emailVerified: record.emailVerified,
    disabled: record.disabled,
    providers: record.providerData.map((p) => (p.providerId === "google.com" ? "Google" : p.providerId === "password" ? "Password" : p.providerId)),
    createdAt: parseTime(record.metadata.creationTime) ?? profile?.createdAt ?? 0,
    lastSignInAt,
    lastActiveAt: Math.max(lastSignInAt ?? 0, lastRefreshAt ?? 0) || null,
    hasProfile: Boolean(profile),
    limits: cleanOverrides(profile?.limits),
    owned: counts.owned.get(record.uid) ?? 0,
    member: counts.member.get(record.uid) ?? 0,
  };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const [records, profiles, counts] = await Promise.all([listAuthUsers(), userProfiles(), membershipCounts()]);
  return records.map((r) => toAdminUser(r, profiles.get(r.uid), counts)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAdminUser(uid: string): Promise<{ user: AdminUser; elections: AdminUserElection[] } | null> {
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) return null;
  let record: UserRecord;
  try {
    record = await adminAuth().getUser(uid);
  } catch {
    return null;
  }
  const [profileSnap, electionsSnap] = await Promise.all([
    adminDb().collection("users").doc(uid).get(),
    electionsCol().where("memberIds", "array-contains", uid).get(),
  ]);
  const now = Date.now();
  const elections = electionsSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title as string,
        orgName: data.orgName as string,
        role: (data.members as Record<string, Role>)[uid],
        status: getEffectiveStatus(data as Parameters<typeof getEffectiveStatus>[0], now),
        voters: (data.counts?.voters as number | undefined) ?? 0,
        endsAt: data.endsAt as number,
      };
    })
    .sort((a, b) => b.endsAt - a.endsAt);
  const owned = new Map([[uid, elections.filter((e) => e.role === "owner").length]]);
  const member = new Map([[uid, elections.filter((e) => e.role !== "owner").length]]);
  const profile = profileSnap.data() as { displayName?: string; createdAt?: number; limits?: unknown } | undefined;
  return { user: toAdminUser(record, profile, { owned, member }), elections };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    return await adminAuth().getUserByEmail(email.trim().toLowerCase());
  } catch {
    return null;
  }
}
