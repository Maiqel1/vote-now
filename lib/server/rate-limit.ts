import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { sha256 } from "../crypto";
import { adminDb } from "../firebase-admin";
import { rateKind } from "../rate-limit-keys";

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export interface RateLimitState {
  key: string;
  kind: string;
  attempts: number;
  limit: number | null;
  blocked: boolean;
  retryAfterMs: number;
}

export const MAX_RATE_WINDOW_MS = 60 * 60 * 1000;

export function rateLimitsCol() {
  return adminDb().collection("rateLimits");
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const db = adminDb();
  const ref = rateLimitsCol().doc(sha256(key));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { count: number; windowStart: number } | undefined;
    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, {
        count: 1,
        limit,
        kind: rateKind(key),
        windowStart: now,
        expiresAt: Timestamp.fromMillis(now + windowMs),
      });
      return { ok: true, retryAfterMs: 0 };
    }
    if (data.count >= limit) {
      return { ok: false, retryAfterMs: data.windowStart + windowMs - now };
    }
    tx.update(ref, { count: FieldValue.increment(1) });
    return { ok: true, retryAfterMs: 0 };
  });
}

export async function rateLimitStates(keys: string[]): Promise<RateLimitState[]> {
  if (keys.length === 0) return [];
  const snaps = await adminDb().getAll(...keys.map((key) => rateLimitsCol().doc(sha256(key))));
  const now = Date.now();
  return snaps.map((snap, i) => {
    const data = snap.data() as { count?: number; limit?: number; expiresAt?: Timestamp } | undefined;
    const expiresAt = data?.expiresAt?.toMillis() ?? 0;
    const active = Boolean(data) && expiresAt > now;
    const attempts = active ? data?.count ?? 0 : 0;
    const limit = typeof data?.limit === "number" ? data.limit : null;
    const blocked = active && limit !== null && attempts >= limit;
    return { key: keys[i], kind: rateKind(keys[i]), attempts, limit, blocked, retryAfterMs: blocked ? expiresAt - now : 0 };
  });
}

export async function clearRateLimits(keys: string[]): Promise<number> {
  const states = await rateLimitStates(keys);
  await Promise.all(keys.map((key) => rateLimitsCol().doc(sha256(key)).delete()));
  return states.filter((state) => state.attempts > 0).length;
}

export function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function retryMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
