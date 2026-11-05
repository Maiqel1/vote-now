import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let googleKeys: JWTVerifyGetKey | null = null;

export interface GoogleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

export async function verifyGoogleIdToken(
  token: unknown,
  clientId: string | null = googleClientId(),
  keys?: JWTVerifyGetKey,
): Promise<GoogleIdentity | null> {
  if (typeof token !== "string" || !token || !clientId) return null;
  const keySet = keys ?? (googleKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));
  try {
    const { payload } = await jwtVerify(token, keySet, { issuer: GOOGLE_ISSUERS, audience: clientId });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
    };
  } catch {
    return null;
  }
}
