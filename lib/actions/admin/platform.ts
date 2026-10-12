"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperadmin } from "../../auth/superadmin";
import { sendEmail } from "../../email";
import { testEmail } from "../../email/templates";
import { MAX_BANNER_LENGTH, MAX_EMAIL_DAILY_CAP } from "../../platform-config";
import type { ActionResult } from "../../types";
import { logAdminAction } from "../../server/admin-audit";
import { environmentInfo } from "../../server/admin/system";
import { reserveEmails } from "../../server/email-quota";
import { updatePlatformConfig } from "../../server/platform-config";
import { fail, ok, run, zodMessage } from "../guard";

const settingsSchema = z.object({
  signupsOpen: z.boolean(),
  electionsOpen: z.boolean(),
  bannerMessage: z.string().trim().max(MAX_BANNER_LENGTH, `Keep the banner under ${MAX_BANNER_LENGTH} characters`),
  bannerTone: z.enum(["info", "warning"]),
  emailDailyCap: z.number().int().min(0).max(MAX_EMAIL_DAILY_CAP).nullable(),
});

export async function savePlatformSettings(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    const { bannerMessage, bannerTone, ...rest } = parsed.data;
    const banner = bannerMessage ? { message: bannerMessage, tone: bannerTone } : null;
    await updatePlatformConfig({ ...rest, banner }, admin.email);
    await logAdminAction(admin, "platform.settings_updated", { type: "platform", id: "settings" }, { ...rest, banner: banner?.message ?? null });
    revalidatePath("/", "layout");
    return ok();
  });
}

export async function sendTestEmail(to: string): Promise<ActionResult<{ status: "sent" | "skipped" }>> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const address = z.string().trim().toLowerCase().email().safeParse(to);
    if (!address.success) return fail("Enter a valid email address.");
    if ((await reserveEmails(1)) === 0) return fail("The daily email limit has been reached.");
    let status: "sent" | "skipped";
    try {
      status = await sendEmail({ to: address.data, ...testEmail({ environment: environmentInfo().label, sentBy: admin.email }) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await logAdminAction(admin, "email.test_failed", { type: "email", id: address.data }, { error: message.slice(0, 300) });
      return fail(`Sending failed: ${message.slice(0, 300)}`);
    }
    await logAdminAction(admin, "email.test_sent", { type: "email", id: address.data }, { status });
    return ok({ status });
  });
}
