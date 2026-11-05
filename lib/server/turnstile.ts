import "server-only";

export type TurnstileAction = "account" | "voter_sign_in" | "resend_link" | "poll_create" | "poll_vote";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

interface SiteverifyResult {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

function isTestSecret(secret: string): boolean {
  return /^[123]x0{10}/.test(secret);
}

export function expectedHostnames(): Set<string> {
  const configured = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length > 0) return new Set(configured);
  try {
    return new Set([new URL(process.env.APP_URL ?? "").hostname.toLowerCase()]);
  } catch {
    return new Set();
  }
}

export async function verifyTurnstile(token: unknown, ip: string | undefined, action: TurnstileAction): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return false;
    const result = (await res.json()) as SiteverifyResult;
    if (result.success !== true) return false;
    if (isTestSecret(secret)) return true;
    const hosts = expectedHostnames();
    const passed = result.action === action && typeof result.hostname === "string" && hosts.has(result.hostname.toLowerCase());
    if (!passed) console.warn("[turnstile] rejected", { expected: action, action: result.action, hostname: result.hostname });
    return passed;
  } catch {
    return false;
  }
}
