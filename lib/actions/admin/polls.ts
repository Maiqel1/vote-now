"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "../../auth/superadmin";
import { pollStatus } from "../../polls";
import { logAdminAction } from "../../server/admin-audit";
import { getPoll, pollDoc } from "../../server/polls";
import type { ActionResult } from "../../types";
import { fail, ok, run } from "../guard";

export async function adminEndPoll(code: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const poll = await getPoll(code);
    if (!poll) return fail("Poll not found.");
    if (pollStatus(poll) !== "open") return fail("This poll isn't running.");
    await pollDoc(poll.code).update({ closedAt: Date.now() });
    await logAdminAction(admin, "poll.ended", { type: "poll", id: poll.code, label: poll.title.slice(0, 120) });
    revalidatePath("/admin/polls");
    return ok();
  });
}

export async function adminSetPollRemoved(code: string, removed: boolean): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireSuperadmin();
    const poll = await getPoll(code);
    if (!poll) return fail("Poll not found.");
    await pollDoc(poll.code).update({ removedAt: removed ? Date.now() : null });
    await logAdminAction(admin, removed ? "poll.removed" : "poll.restored", {
      type: "poll",
      id: poll.code,
      label: poll.title.slice(0, 120),
    });
    revalidatePath("/admin/polls");
    return ok();
  });
}
