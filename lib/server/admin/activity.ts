import "server-only";
import { adminDb } from "../../firebase-admin";
import type { AuditEntry } from "../../types";
import { adminAuditCol, type AdminAuditEntry } from "../admin-audit";
import { errorLogCol, type ErrorLogEntry } from "../error-log";

export interface PlatformActivity extends AuditEntry {
  electionId: string;
  electionTitle: string;
}

export async function platformActivity(limit = 60): Promise<PlatformActivity[]> {
  const db = adminDb();
  const snap = await db.collectionGroup("audit").orderBy("at", "desc").limit(limit).get();
  const electionIds = Array.from(new Set(snap.docs.map((d) => d.ref.parent.parent!.id)));
  const titles = new Map<string, string>();
  if (electionIds.length > 0) {
    const elections = await db.getAll(...electionIds.map((id) => db.collection("elections").doc(id)));
    elections.forEach((e) => titles.set(e.id, (e.data()?.title as string | undefined) ?? "Deleted election"));
  }
  return snap.docs.map((d) => {
    const electionId = d.ref.parent.parent!.id;
    return { ...(d.data() as Omit<AuditEntry, "id">), id: d.id, electionId, electionTitle: titles.get(electionId) ?? "" };
  });
}

export async function adminLog(options: { limit?: number; targetId?: string } = {}): Promise<AdminAuditEntry[]> {
  const limit = options.limit ?? 100;
  const snap = await adminAuditCol()
    .orderBy("at", "desc")
    .limit(options.targetId ? 500 : limit)
    .get();
  const entries = snap.docs.map((d) => ({ ...(d.data() as Omit<AdminAuditEntry, "id">), id: d.id }));
  return options.targetId ? entries.filter((e) => e.target.id === options.targetId).slice(0, limit) : entries;
}

export async function recentErrors(options: { uid?: string; electionId?: string; limit?: number } = {}): Promise<ErrorLogEntry[]> {
  let query = errorLogCol().orderBy("at", "desc");
  if (options.uid) query = errorLogCol().where("uid", "==", options.uid).orderBy("at", "desc");
  else if (options.electionId) query = errorLogCol().where("electionId", "==", options.electionId).orderBy("at", "desc");
  const snap = await query.limit(options.limit ?? 100).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      message: data.message as string,
      name: data.name as string,
      stack: data.stack as string,
      source: data.source as string,
      uid: (data.uid as string | null) ?? null,
      electionId: (data.electionId as string | null) ?? null,
      path: (data.path as string | null) ?? null,
      at: data.at as number,
    };
  });
}
