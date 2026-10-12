import "server-only";
import type { SessionUser } from "../auth/session";
import { adminDb } from "../firebase-admin";

export type AdminTargetType = "user" | "election" | "voter" | "ip" | "platform" | "email";

export interface AdminTarget {
  type: AdminTargetType;
  id: string;
  label?: string;
}

export interface AdminAuditEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  target: AdminTarget;
  meta: Record<string, unknown>;
  at: number;
}

export function adminAuditCol() {
  return adminDb().collection("adminAudit");
}

export async function logAdminAction(
  admin: SessionUser,
  action: string,
  target: AdminTarget,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await adminAuditCol().add({ actorUid: admin.uid, actorEmail: admin.email, action, target, meta, at: Date.now() });
}
