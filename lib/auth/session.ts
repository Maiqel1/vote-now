import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminAuth, adminDb } from "../firebase-admin";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export interface SessionUser {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  let decoded;
  try {
    decoded = await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
  const profile = await adminDb().collection("users").doc(decoded.uid).get();
  const displayName = (profile.data()?.displayName as string | undefined) || decoded.name || decoded.email || "";
  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: displayName,
    emailVerified: Boolean(decoded.email_verified),
  };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function isEmailVerified(uid: string): Promise<boolean> {
  const record = await adminAuth().getUser(uid);
  return record.emailVerified;
}
