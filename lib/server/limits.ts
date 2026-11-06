import "server-only";
import { adminDb } from "../firebase-admin";
import { limitsForAccess, resolveLimits, type LimitOverrides, type PlanLimits } from "../plans";
import type { Election } from "../types";
import { voterAccessOf } from "../voter-access";

export async function userLimitOverrides(uid: string): Promise<LimitOverrides | undefined> {
  const snap = await adminDb().collection("users").doc(uid).get();
  return snap.data()?.limits as LimitOverrides | undefined;
}

export async function limitsForUser(uid: string): Promise<PlanLimits> {
  return resolveLimits(await userLimitOverrides(uid));
}

export async function emailLimitsForElection(election: Pick<Election, "ownerId" | "limits">): Promise<PlanLimits> {
  return resolveLimits(await userLimitOverrides(election.ownerId), election.limits);
}

export async function limitsForElection(election: Pick<Election, "ownerId" | "limits" | "voterAccess">): Promise<PlanLimits> {
  return limitsForAccess(await emailLimitsForElection(election), voterAccessOf(election.voterAccess));
}
