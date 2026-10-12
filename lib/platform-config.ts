export type BannerTone = "info" | "warning";

export interface PlatformConfig {
  signupsOpen: boolean;
  electionsOpen: boolean;
  banner: { message: string; tone: BannerTone } | null;
  emailDailyCap: number | null;
  updatedAt: number | null;
  updatedBy: string | null;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  signupsOpen: true,
  electionsOpen: true,
  banner: null,
  emailDailyCap: null,
  updatedAt: null,
  updatedBy: null,
};

export const MAX_BANNER_LENGTH = 280;
export const MAX_EMAIL_DAILY_CAP = 100000;

export function parsePlatformConfig(data: unknown): PlatformConfig {
  if (!data || typeof data !== "object") return { ...DEFAULT_PLATFORM_CONFIG };
  const raw = data as Record<string, unknown>;
  const banner = raw.banner as { message?: unknown; tone?: unknown } | null | undefined;
  const message = typeof banner?.message === "string" ? banner.message.trim().slice(0, MAX_BANNER_LENGTH) : "";
  const cap = raw.emailDailyCap;
  return {
    signupsOpen: raw.signupsOpen !== false,
    electionsOpen: raw.electionsOpen !== false,
    banner: message ? { message, tone: banner?.tone === "warning" ? "warning" : "info" } : null,
    emailDailyCap:
      typeof cap === "number" && Number.isInteger(cap) && cap >= 0 ? Math.min(cap, MAX_EMAIL_DAILY_CAP) : null,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : null,
    updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : null,
  };
}
