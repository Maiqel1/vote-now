import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_MINUTES = 30;

function secret(): Uint8Array {
  const value = process.env.VOTER_SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("VOTER_SESSION_SECRET is not set");
    return new TextEncoder().encode("local-dev-voter-session-secret");
  }
  return new TextEncoder().encode(value);
}

export function voterCookieName(electionId: string): string {
  return `vn_voter_${electionId}`;
}

export async function setVoterSession(electionId: string, voterId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(voterId)
    .setAudience(electionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MINUTES}m`)
    .sign(secret());
  cookies().set(voterCookieName(electionId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MINUTES * 60,
  });
}

export async function readVoterSession(electionId: string): Promise<string | null> {
  const token = cookies().get(voterCookieName(electionId))?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: electionId });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function clearVoterSession(electionId: string): void {
  cookies().delete(voterCookieName(electionId));
}
