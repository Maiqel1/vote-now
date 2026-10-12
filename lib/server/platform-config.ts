import "server-only";
import { adminDb } from "../firebase-admin";
import { DEFAULT_PLATFORM_CONFIG, parsePlatformConfig, type PlatformConfig } from "../platform-config";

const CACHE_MS = 30_000;

const shared = globalThis as typeof globalThis & { __voteNowPlatformConfig?: { value: PlatformConfig; at: number } };

function configDoc() {
  return adminDb().collection("config").doc("platform");
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const cached = shared.__voteNowPlatformConfig;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const snap = await configDoc().get();
    const value = parsePlatformConfig(snap.data());
    shared.__voteNowPlatformConfig = { value, at: Date.now() };
    return value;
  } catch (error) {
    console.error("[platform-config] read failed", error);
    return cached?.value ?? { ...DEFAULT_PLATFORM_CONFIG };
  }
}

export async function updatePlatformConfig(
  patch: Partial<Omit<PlatformConfig, "updatedAt" | "updatedBy">>,
  updatedBy: string,
): Promise<PlatformConfig> {
  await configDoc().set({ ...patch, updatedAt: Date.now(), updatedBy }, { merge: true });
  shared.__voteNowPlatformConfig = undefined;
  return getPlatformConfig();
}
