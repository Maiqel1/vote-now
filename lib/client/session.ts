"use client";

import { FirebaseError } from "firebase/app";
import { signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export async function establishSession(
  user: User,
  options: { turnstileToken?: string | null; displayName?: string; forceRefresh?: boolean } = {},
): Promise<void> {
  const idToken = await user.getIdToken(options.forceRefresh ?? false);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      turnstileToken: options.turnstileToken ?? undefined,
      displayName: options.displayName,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Could not sign you in");
  }
}

export async function signOutEverywhere(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
  await signOut(auth).catch(() => undefined);
}

export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

const AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/weak-password": "Use a stronger password (at least 8 characters).",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) return AUTH_MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
