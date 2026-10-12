import "server-only";
import { redirect } from "next/navigation";
import { ActionError } from "../actions/guard";
import { isSuperadminEmail } from "../superadmin";
import { getCurrentUser, type SessionUser } from "./session";

export function isSuperadmin(user: Pick<SessionUser, "email" | "emailVerified"> | null | undefined): boolean {
  return Boolean(user?.emailVerified && isSuperadminEmail(user.email, process.env.SUPERADMIN_EMAILS));
}

export async function getSuperadmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && isSuperadmin(user) ? user : null;
}

export async function requireSuperadminPage(): Promise<SessionUser> {
  const admin = await getSuperadmin();
  if (!admin) redirect("/dashboard");
  return admin;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const admin = await getSuperadmin();
  if (!admin) throw new ActionError("You don't have permission to do that.");
  return admin;
}
