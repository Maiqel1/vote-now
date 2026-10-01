import "server-only";
import type { Transaction, WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "../firebase-admin";

export interface Actor {
  uid: string | null;
  name: string;
}

export const SYSTEM_ACTOR: Actor = { uid: null, name: "System" };

function entry(actor: Actor, action: string, meta: Record<string, unknown>) {
  return { actorUid: actor.uid, actorName: actor.name, action, meta, at: Date.now() };
}

function auditCollection(electionId: string) {
  return adminDb().collection("elections").doc(electionId).collection("audit");
}

export async function logAudit(electionId: string, actor: Actor, action: string, meta: Record<string, unknown> = {}) {
  await auditCollection(electionId).add(entry(actor, action, meta));
}

export function logAuditIn(
  writer: Transaction | WriteBatch,
  electionId: string,
  actor: Actor,
  action: string,
  meta: Record<string, unknown> = {},
) {
  (writer as WriteBatch).set(auditCollection(electionId).doc(), entry(actor, action, meta));
}
