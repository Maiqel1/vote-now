import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let googleKeys: JWTVerifyGetKey | null = null;

export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

export async function verifyGoogleIdToken(
  token: unknown,
  clientId: string | null = googleClientId(),
  keys?: JWTVerifyGetKey,
): Promise<string | null> {
  if (typeof token !== "string" || !token || !clientId) return null;
  const keySet = keys ?? (googleKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));
  try {
    const { payload } = await jwtVerify(token, keySet, { issuer: GOOGLE_ISSUERS, audience: clientId });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
