import { NextResponse } from "next/server";
import { isFingerprint, networkKey, pollStatus, validateChoices, voteKeys } from "@/lib/polls";
import { RATE_KEYS } from "@/lib/rate-limit-keys";
import { rememberDevice, resolveDevice } from "@/lib/server/device";
import { withErrorLog } from "@/lib/server/error-log";
import { verifyGoogleIdToken } from "@/lib/server/google-id";
import { DuplicateVote, getPoll, recordPollVote } from "@/lib/server/polls";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const runtime = "nodejs";

async function handlePost(request: Request, { params }: { params: { code: string } }) {
  const poll = await getPoll(params.code);
  if (!poll || poll.removedAt !== null) return NextResponse.json({ error: "This poll doesn't exist or was removed." }, { status: 404 });
  if (pollStatus(poll) !== "open") return NextResponse.json({ error: "This poll has ended.", closed: true }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    choices?: unknown;
    deviceId?: unknown;
    fingerprint?: unknown;
    turnstileToken?: string;
    googleToken?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const choices = validateChoices(poll, body.choices);
  if (!choices.ok) return NextResponse.json({ error: choices.error }, { status: 400 });

  const ip = clientIp();
  const limit = await rateLimit(RATE_KEYS.pollVote(poll.code, ip), 20, 10 * 60 * 1000);
  if (!limit.ok) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60000));
    return NextResponse.json(
      { error: `Too many votes from your connection. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }
  if (!(await verifyTurnstile(body.turnstileToken, ip, "poll_vote"))) {
    return NextResponse.json({ error: "Verification failed. Please retry the challenge." }, { status: 400 });
  }

  let googleSub: string | null = null;
  if (poll.strict) {
    googleSub = await verifyGoogleIdToken(body.googleToken);
    if (!googleSub) return NextResponse.json({ error: "Sign in with Google to vote in this poll.", needsGoogle: true }, { status: 401 });
  } else if (!isFingerprint(body.fingerprint)) {
    return NextResponse.json({ error: "We couldn't check this browser. Refresh the page and try again." }, { status: 400 });
  }

  const device = resolveDevice(body.deviceId);
  const keys = voteKeys({
    code: poll.code,
    strict: poll.strict,
    deviceIds: device.ids,
    fingerprint: isFingerprint(body.fingerprint) ? body.fingerprint : null,
    network: networkKey(ip),
    googleSub,
  });

  try {
    await recordPollVote(poll, choices.choices, keys);
  } catch (error) {
    if (error instanceof DuplicateVote) {
      rememberDevice(device.id);
      return NextResponse.json({ error: "You've already voted in this poll.", alreadyVoted: true }, { status: 409 });
    }
    throw error;
  }

  rememberDevice(device.id);
  return NextResponse.json({ ok: true, deviceId: device.id });
}

export const POST = withErrorLog("api: poll vote", handlePost);
