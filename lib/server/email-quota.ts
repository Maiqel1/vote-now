import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { randomInt } from "crypto";
import { adminDb } from "../firebase-admin";
import { getPlatformConfig } from "./platform-config";

const SHARDS = 10;

function todayShards() {
  return adminDb().collection("emailUsage").doc(new Date().toISOString().slice(0, 10)).collection("shards");
}

export async function dailyEmailCap(): Promise<number> {
  const { emailDailyCap } = await getPlatformConfig();
  return emailDailyCap ?? Number(process.env.EMAIL_DAILY_CAP ?? 250);
}

export async function usedToday(): Promise<number> {
  const snap = await todayShards().get();
  return snap.docs.reduce((sum, d) => sum + ((d.data().count as number | undefined) ?? 0), 0);
}

async function bump(delta: number): Promise<void> {
  await todayShards()
    .doc(String(randomInt(SHARDS)))
    .set({ count: FieldValue.increment(delta) }, { merge: true });
}

export async function reserveEmails(requested: number): Promise<number> {
  if (requested <= 0) return 0;
  const granted = Math.max(0, Math.min(requested, (await dailyEmailCap()) - (await usedToday())));
  if (granted > 0) await bump(granted);
  return granted;
}

export async function releaseEmails(count: number): Promise<void> {
  if (count > 0) await bump(-count);
}

export async function emailsRemainingToday(): Promise<number> {
  return Math.max(0, (await dailyEmailCap()) - (await usedToday()));
}
