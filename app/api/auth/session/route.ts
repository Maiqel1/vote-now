import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

const MAX_SIGN_IN_AGE_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const ip = clientIp();
  const limit = await rateLimit(`session:${ip}`, 30, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many sign-in attempts. Try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as {
    idToken?: string;
    turnstileToken?: string;
    displayName?: string;
  } | null;
  if (!body?.idToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(body.idToken, true);
  } catch {
    return NextResponse.json({ error: "Invalid sign-in. Please try again." }, { status: 401 });
  }

  if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const userRef = adminDb().collection("users").doc(decoded.uid);
  const existing = await userRef.get();
  if (!existing.exists) {
    const human = await verifyTurnstile(body.turnstileToken, ip);
    if (!human) return NextResponse.json({ error: "Verification failed. Please retry the challenge." }, { status: 400 });
    await userRef.set({
      displayName: (body.displayName ?? decoded.name ?? "").toString().trim().slice(0, 80),
      email: decoded.email ?? "",
      plan: "free",
      createdAt: Date.now(),
    });
  }

  const sessionCookie = await adminAuth().createSessionCookie(body.idToken, { expiresIn: SESSION_MAX_AGE_MS });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
