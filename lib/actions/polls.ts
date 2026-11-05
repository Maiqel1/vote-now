"use server";

import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "../auth/session";
import { hashToken, randomId, randomToken } from "../crypto";
import {
  buildPoll,
  createPollSchema,
  POLL_CODE_LENGTH,
  pollStatus,
  resultsPayload,
  toPublicPoll,
  type Poll,
  type PollResultsPayload,
  type PublicPoll,
} from "../polls";
import { RATE_KEYS } from "../rate-limit-keys";
import { googleClientId } from "../server/google-id";
import { getPlatformConfig } from "../server/platform-config";
import { deletePollData, getPoll, getPollResults, pollDoc } from "../server/polls";
import { clientIp, rateLimit } from "../server/rate-limit";
import { verifyTurnstile } from "../server/turnstile";
import type { ActionResult } from "../types";
import { ActionError, fail, ok, run, zodMessage } from "./guard";

function minutesUntil(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function authorize(code: string, key: unknown): Promise<Poll> {
  const poll = await getPoll(code);
  if (!poll || poll.removedAt !== null) throw new ActionError("This poll doesn't exist or was removed.");
  if (typeof key === "string" && key && hashToken(key) === poll.manageKeyHash) return poll;
  const user = await getCurrentUser();
  if (user && poll.creatorUid === user.uid) return poll;
  throw new ActionError("This manage link isn't valid. Open the link you got when you created the poll.");
}

export async function createPoll(
  input: unknown,
  turnstileToken: string | null,
): Promise<ActionResult<{ code: string; manageKey: string }>> {
  return run(async () => {
    if (!(await getPlatformConfig()).pollsOpen) return fail("New polls are paused right now. Please try again later.");
    const parsed = createPollSchema.safeParse(input);
    if (!parsed.success) return fail(zodMessage(parsed.error));
    if (parsed.data.strict && !googleClientId()) return fail("Google sign-in isn't available for polls yet.");

    const ip = clientIp();
    const limit = await rateLimit(RATE_KEYS.pollCreate(ip), 10, 60 * 60 * 1000);
    if (!limit.ok) return fail(`You've created a lot of polls. Try again in ${minutesUntil(limit.retryAfterMs)}.`);
    if (!(await verifyTurnstile(turnstileToken, ip, "poll_create"))) return fail("Verification failed. Please retry the challenge.");

    const user = await getCurrentUser();
    const manageKey = randomToken(24);
    const now = Date.now();
    const data = {
      ...buildPoll(parsed.data),
      strict: parsed.data.strict,
      resultsVisibility: parsed.data.resultsVisibility,
      createdAt: now,
      endsAt: now + parsed.data.durationMinutes * 60_000,
      closedAt: null,
      creatorUid: user?.uid ?? null,
      manageKeyHash: hashToken(manageKey),
      reportCount: 0,
      removedAt: null,
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = randomId(POLL_CODE_LENGTH);
      try {
        await pollDoc(code).create(data);
        return ok({ code, manageKey });
      } catch (error) {
        if ((error as { code?: number }).code !== 6) throw error;
      }
    }
    throw new Error("Could not allocate a poll code");
  });
}

export async function getManagedPoll(
  code: string,
  key: string | null,
): Promise<ActionResult<{ poll: PublicPoll; results: PollResultsPayload }>> {
  return run(async () => {
    const poll = await authorize(code, key);
    const results = await getPollResults(poll.code);
    return ok({ poll: toPublicPoll(poll), results: resultsPayload(poll, results, Date.now(), true) });
  });
}

export async function endPoll(code: string, key: string | null): Promise<ActionResult> {
  return run(async () => {
    const poll = await authorize(code, key);
    if (pollStatus(poll) !== "open") return fail("This poll has already ended.");
    await pollDoc(poll.code).update({ closedAt: Date.now() });
    return ok();
  });
}

export async function deletePoll(code: string, key: string | null): Promise<ActionResult> {
  return run(async () => {
    const poll = await authorize(code, key);
    await deletePollData(poll.code);
    return ok();
  });
}

export async function reportPoll(code: string): Promise<ActionResult> {
  return run(async () => {
    const poll = await getPoll(code);
    if (!poll || poll.removedAt !== null) return fail("This poll doesn't exist or was removed.");
    const limit = await rateLimit(RATE_KEYS.pollReport(poll.code, clientIp()), 1, 24 * 60 * 60 * 1000);
    if (limit.ok) await pollDoc(poll.code).update({ reportCount: FieldValue.increment(1) });
    return ok();
  });
}
