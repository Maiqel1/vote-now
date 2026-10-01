import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { sha256 } from "../crypto";
import { adminDb } from "../firebase-admin";

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const db = adminDb();
  const ref = db.collection("rateLimits").doc(sha256(key));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { count: number; windowStart: number } | undefined;
    if (!data || now - data.windowStart >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now, expiresAt: Timestamp.fromMillis(now + windowMs) });
      return { ok: true, retryAfterMs: 0 };
    }
    if (data.count >= limit) {
      return { ok: false, retryAfterMs: data.windowStart + windowMs - now };
    }
    tx.update(ref, { count: FieldValue.increment(1) });
    return { ok: true, retryAfterMs: 0 };
  });
}

export function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function retryMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
