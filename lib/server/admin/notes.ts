import "server-only";
import { adminDb } from "../../firebase-admin";

export type NoteTarget = "user" | "election";

export const MAX_NOTE_LENGTH = 4000;

function noteDoc(type: NoteTarget, id: string) {
  return adminDb().collection("adminNotes").doc(`${type}_${id}`);
}

export async function getAdminNote(type: NoteTarget, id: string): Promise<{ text: string; updatedAt: number | null; updatedBy: string | null }> {
  const snap = await noteDoc(type, id).get();
  const data = snap.data();
  return {
    text: (data?.text as string | undefined) ?? "",
    updatedAt: (data?.updatedAt as number | undefined) ?? null,
    updatedBy: (data?.updatedBy as string | undefined) ?? null,
  };
}

export async function setAdminNote(type: NoteTarget, id: string, text: string, updatedBy: string): Promise<void> {
  const trimmed = text.trim().slice(0, MAX_NOTE_LENGTH);
  if (!trimmed) {
    await noteDoc(type, id).delete();
    return;
  }
  await noteDoc(type, id).set({ type, targetId: id, text: trimmed, updatedAt: Date.now(), updatedBy });
}
