import "server-only";
import { cookies } from "next/headers";
import { randomToken } from "../crypto";
import { isDeviceId } from "../polls";

export const DEVICE_COOKIE = "vn_device";
const DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export function resolveDevice(claimed: unknown): { id: string; ids: string[] } {
  const known = [...new Set([cookies().get(DEVICE_COOKIE)?.value, claimed].filter(isDeviceId))];
  const id = known[0] ?? randomToken(18);
  return { id, ids: known.length > 0 ? known : [id] };
}

export function rememberDevice(id: string): void {
  cookies().set(DEVICE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_MAX_AGE_SECONDS,
  });
}
