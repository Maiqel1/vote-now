"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "../../auth/superadmin";
import { sendEmail } from "../../email";
import { accountLinkEmail } from "../../email/templates";
import { adminAuth, adminDb } from "../../firebase-admin";
import { appUrl } from "../../format";
import { cleanOverrides, type LimitOverrides } from "../../plans";
import type { ActionResult } from "../../types";
import { logAdminAction } from "../../server/admin-audit";
import { setAdminNote } from "../../server/admin/notes";
import { logAuditIn, SUPPORT_ACTOR } from "../../server/audit";
import { reserveEmails } from "../../server/email-quota";
import { electionsCol } from "../../server/elections";
import { ActionError, fail, ok, run } from "../guard";

function refreshUser(uid: string) {
  revalidatePath(`/admin/users/${uid}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

async function targetUser(uid: string) {
  if (typeof uid !== "string" || !/^[A-Za-z0-9]{1,128}$/.test(uid)) throw new ActionError("User not found.");
  try {
    return await adminAuth().getUser(uid);
  } catch {
    throw new ActionError("User not found.");
  }
}

export async function setUserDisabled(uid: string, disabled: boolean): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    if (user.uid === admin.uid) return fail("You can't disable your own account.");
    await adminAuth().updateUser(user.uid, { disabled: Boolean(disabled) });
    if (disabled) await adminAuth().revokeRefreshTokens(user.uid);
    await logAdminAction(admin, disabled ? "user.disabled" : "user.enabled", { type: "user", id: user.uid, label: user.email });
    refreshUser(user.uid);
    return ok();
  });
}

export async function signOutUserEverywhere(uid: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    await adminAuth().revokeRefreshTokens(user.uid);
    await logAdminAction(admin, "user.signed_out", { type: "user", id: user.uid, label: user.email });
    refreshUser(user.uid);
    return ok();
  });
}

export async function markEmailVerified(uid: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    if (user.emailVerified) return fail("This email is already verified.");
    await adminAuth().updateUser(user.uid, { emailVerified: true });
    await logAdminAction(admin, "user.email_verified", { type: "user", id: user.uid, label: user.email });
    refreshUser(user.uid);
    return ok();
  });
}

export async function createAccountLink(
  uid: string,
  kind: "reset" | "verify",
  send: boolean,
): Promise<ActionResult<{ link: string; sent: boolean }>> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    if (!user.email) return fail("This account has no email address.");
    if (kind !== "reset" && kind !== "verify") return fail("Unknown link type.");
    if (kind === "reset" && !user.providerData.some((p) => p.providerId === "password")) {
      return fail("This account signs in with Google, so there's no password to reset.");
    }
    if (kind === "verify" && user.emailVerified) return fail("This email is already verified.");

    const link =
      kind === "reset"
        ? await adminAuth().generatePasswordResetLink(user.email, { url: appUrl("/login") })
        : await adminAuth().generateEmailVerificationLink(user.email, { url: appUrl("/dashboard") });

    let sent = false;
    if (send) {
      if ((await reserveEmails(1)) === 0) return fail("The daily email limit has been reached. Copy the link instead.");
      const profile = await adminDb().collection("users").doc(user.uid).get();
      const name = (profile.data()?.displayName as string | undefined) || user.displayName || "";
      sent = (await sendEmail({ to: user.email, ...accountLinkEmail({ kind, link, name }) })) === "sent";
    }
    await logAdminAction(admin, kind === "reset" ? "user.reset_link_created" : "user.verify_link_created", {
      type: "user",
      id: user.uid,
      label: user.email,
    }, { emailed: sent });
    return ok({ link, sent });
  });
}

export async function setUserLimits(uid: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    const overrides: LimitOverrides = cleanOverrides(input);
    const empty = Object.keys(overrides).length === 0;
    await adminDb()
      .collection("users")
      .doc(user.uid)
      .set({ limits: empty ? FieldValue.delete() : overrides, email: user.email ?? "" }, { merge: true });
    await logAdminAction(admin, empty ? "user.limits_reset" : "user.limits_changed", { type: "user", id: user.uid, label: user.email }, { ...overrides });
    refreshUser(user.uid);
    revalidatePath("/dashboard", "layout");
    return ok();
  });
}

export async function saveUserNote(uid: string, text: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    await setAdminNote("user", user.uid, String(text ?? ""), admin.email);
    await logAdminAction(admin, "user.note_updated", { type: "user", id: user.uid, label: user.email });
    refreshUser(user.uid);
    return ok();
  });
}

export async function deleteUserAccount(uid: string, confirmEmail: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const user = await targetUser(uid);
    if (user.uid === admin.uid) return fail("You can't delete your own account from here.");
    if (String(confirmEmail ?? "").trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return fail("Type the account's email exactly to confirm.");
    }
    const owned = await electionsCol().where("ownerId", "==", user.uid).limit(1).get();
    if (!owned.empty) return fail("This person still owns elections. Transfer or delete them first.");

    const db = adminDb();
    const memberships = await electionsCol().where("memberIds", "array-contains", user.uid).get();
    for (const doc of memberships.docs) {
      const batch = db.batch();
      batch.update(doc.ref, {
        [`members.${user.uid}`]: FieldValue.delete(),
        memberIds: FieldValue.arrayRemove(user.uid),
        updatedAt: Date.now(),
      });
      logAuditIn(batch, doc.id, SUPPORT_ACTOR, "team.removed", { uid: user.uid, reason: "account deleted" });
      await batch.commit();
    }
    await db.collection("users").doc(user.uid).delete();
    await db.collection("adminNotes").doc(`user_${user.uid}`).delete();
    await adminAuth().deleteUser(user.uid);
    await logAdminAction(admin, "user.deleted", { type: "user", id: user.uid, label: user.email }, { memberships: memberships.size });
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return ok();
  });
}
