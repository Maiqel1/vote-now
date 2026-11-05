import { NextResponse } from "next/server";
import { isFingerprint, networkKey, voteKeys } from "@/lib/polls";
import { rememberDevice, resolveDevice } from "@/lib/server/device";
import { withErrorLog } from "@/lib/server/error-log";
import { anyVoteKeyUsed, getPoll } from "@/lib/server/polls";
import { clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGet(request: Request, { params }: { params: { code: string } }) {
  const poll = await getPoll(params.code);
  if (!poll || poll.removedAt !== null) return NextResponse.json({ error: "This poll doesn't exist." }, { status: 404 });

  const url = new URL(request.url);
  const fingerprint = url.searchParams.get("f");
  const device = resolveDevice(url.searchParams.get("d"));
  const keys = voteKeys({
    code: poll.code,
    deviceIds: device.ids,
    fingerprint: isFingerprint(fingerprint) ? fingerprint : null,
    network: networkKey(clientIp()),
    googleSub: null,
  });
  const voted = await anyVoteKeyUsed(poll.code, keys);

  rememberDevice(device.id);
  return NextResponse.json({ deviceId: device.id, voted }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = withErrorLog("api: poll status", handleGet);
