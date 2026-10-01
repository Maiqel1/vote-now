"use server";

import { revalidatePath } from "next/cache";
import { isBallotLocked } from "../election-status";
import { logAudit } from "../server/audit";
import { ballotDoc } from "../server/elections";
import { isAllowedImageUrl } from "../image-url";
import type { ActionResult } from "../types";
import { ballotSchema } from "../validation";
import { fail, ok, requireElection, run, zodMessage } from "./guard";

export async function saveBallot(electionId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { election, actor } = await requireElection(electionId, "admin");
    if (isBallotLocked(election)) return fail("The ballot is locked because voting has started.");
    const parsed = ballotSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));

    for (const position of parsed.data.positions) {
      for (const candidate of position.candidates) {
        if (candidate.photoUrl && !isAllowedImageUrl(candidate.photoUrl)) {
          return fail(`Upload ${candidate.name}'s photo with the upload button.`);
        }
      }
    }

    await ballotDoc(electionId).set({ positions: parsed.data.positions, updatedAt: Date.now() });
    await logAudit(electionId, actor, "ballot.updated", {
      positions: parsed.data.positions.length,
      candidates: parsed.data.positions.reduce((n, p) => n + p.candidates.length, 0),
    });
    revalidatePath(`/dashboard/e/${electionId}`, "layout");
    revalidatePath(`/e/${election.slug}`);
    return ok();
  });
}
