import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../auth/session";
import { adminDb } from "../firebase-admin";

const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

export interface ErrorContext {
  source: string;
  uid?: string | null;
  electionId?: string | null;
  path?: string | null;
}

export interface ErrorLogEntry {
  id: string;
  message: string;
  name: string;
  stack: string;
  source: string;
  uid: string | null;
  electionId: string | null;
  path: string | null;
  at: number;
}

export function errorLogCol() {
  return adminDb().collection("errorLog");
}

export async function logServerError(error: unknown, context: ErrorContext): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const now = Date.now();
    await errorLogCol().add({
      message: err.message.slice(0, 500),
      name: err.name,
      stack: (err.stack ?? "").split("\n").slice(0, 8).join("\n").slice(0, 2000),
      source: context.source,
      uid: context.uid ?? null,
      electionId: context.electionId ?? null,
      path: context.path ?? null,
      at: now,
      expiresAt: Timestamp.fromMillis(now + RETENTION_MS),
    });
  } catch (logError) {
    console.error("[error-log] could not record error", logError);
  }
}

function pathFromReferer(): string | null {
  try {
    const referer = headers().get("referer");
    return referer ? new URL(referer).pathname : null;
  } catch {
    return null;
  }
}

export async function logActionError(error: unknown): Promise<void> {
  const path = pathFromReferer();
  const user = await getCurrentUser().catch(() => null);
  const electionId = path?.match(/^\/dashboard\/e\/([^/]+)/)?.[1] ?? null;
  await logServerError(error, { source: "server action", uid: user?.uid ?? null, electionId, path });
}

export function withErrorLog<C>(source: string, handler: (request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(error);
      await logServerError(error, { source, path: new URL(request.url).pathname });
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
