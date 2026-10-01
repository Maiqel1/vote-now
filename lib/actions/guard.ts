import "server-only";
import type { ZodError } from "zod";
import { getCurrentUser, type SessionUser } from "../auth/session";
import type { Actor } from "../server/audit";
import { getElectionAccess } from "../server/elections";
import type { ActionResult, Election, Role } from "../types";

export class ActionError extends Error {}

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export function actorOf(user: SessionUser): Actor {
  return { uid: user.uid, name: user.name || user.email };
}

export interface ElectionContext {
  user: SessionUser;
  actor: Actor;
  election: Election;
  role: Role;
}

export async function requireActionUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Your session has expired. Please log in again.");
  return user;
}

export async function requireElection(electionId: string, minimum: Role): Promise<ElectionContext> {
  const user = await requireActionUser();
  const access = await getElectionAccess(electionId, user.uid, minimum);
  if (!access) throw new ActionError("You don't have permission to do that.");
  return { user, actor: actorOf(user), election: access.election, role: access.role };
}

export async function run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ActionError) return fail(error.message);
    console.error(error);
    return fail("Something went wrong. Please try again.");
  }
}
