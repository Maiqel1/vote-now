import { describe, expect, it } from "vitest";
import { average, bucketByDay, countSince, DAY_MS, lastNDays, statusBreakdown, turnoutPercent } from "@/lib/admin-metrics";
import { auditLabel, describeAuditMeta } from "@/lib/audit-labels";
import { compactNumber, timeAgo } from "@/lib/format";
import { cleanOverrides, FREE_PLAN, isCustomPlan, LIMIT_CEILINGS, planLabel, resolveLimits } from "@/lib/plans";
import { DEFAULT_PLATFORM_CONFIG, MAX_BANNER_LENGTH, parsePlatformConfig } from "@/lib/platform-config";
import { ipRateKeys, RATE_KEYS, rateKind, voterRateKeys } from "@/lib/rate-limit-keys";
import { isSuperadminEmail, parseEmailList } from "@/lib/superadmin";
import type { Election } from "@/lib/types";

describe("superadmin emails", () => {
  it("parses a comma-separated list, trimming and lowercasing", () => {
    expect(parseEmailList(" Owner@Example.com, ,second@example.com ,not-an-email")).toEqual(["owner@example.com", "second@example.com"]);
    expect(parseEmailList(undefined)).toEqual([]);
  });

  it("matches case-insensitively and rejects everyone when unset", () => {
    expect(isSuperadminEmail("OWNER@example.com", "owner@example.com")).toBe(true);
    expect(isSuperadminEmail("someone@example.com", "owner@example.com")).toBe(false);
    expect(isSuperadminEmail("owner@example.com", "")).toBe(false);
    expect(isSuperadminEmail("", "owner@example.com")).toBe(false);
    expect(isSuperadminEmail(null, undefined)).toBe(false);
  });

  it("does not match on a substring", () => {
    expect(isSuperadminEmail("owner@example.com.evil.io", "owner@example.com")).toBe(false);
    expect(isSuperadminEmail("x-owner@example.com", "owner@example.com")).toBe(false);
  });
});

describe("plan limits", () => {
  it("defaults to the free plan", () => {
    expect(resolveLimits()).toEqual(FREE_PLAN);
    expect(resolveLimits(undefined, null)).toEqual(FREE_PLAN);
    expect(isCustomPlan(resolveLimits())).toBe(false);
    expect(planLabel(resolveLimits())).toBe("Free plan");
  });

  it("applies overrides in order, later ones winning", () => {
    const limits = resolveLimits({ votersPerElection: 500, activeElections: 4 }, { votersPerElection: 1000 });
    expect(limits.votersPerElection).toBe(1000);
    expect(limits.activeElections).toBe(4);
    expect(limits.reminderRounds).toBe(FREE_PLAN.reminderRounds);
    expect(planLabel(limits)).toBe("Custom plan");
  });

  it("ignores junk and caps values at the ceilings", () => {
    expect(cleanOverrides({ votersPerElection: -5, reminderRounds: 1.5, invitesPerVoter: "9", bogus: 3 })).toEqual({});
    expect(cleanOverrides({ votersPerElection: 10_000_000 })).toEqual({ votersPerElection: LIMIT_CEILINGS.votersPerElection });
    expect(cleanOverrides(null)).toEqual({});
  });
});

describe("admin metrics", () => {
  const now = Date.UTC(2026, 9, 12, 15, 0, 0);

  it("lists the last N days oldest first, ending today", () => {
    expect(lastNDays(3, now)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
  });

  it("buckets timestamps by UTC day and drops ones outside the window", () => {
    const times = [now, now - 1000, now - DAY_MS, now - 10 * DAY_MS, now + DAY_MS];
    expect(bucketByDay(times, 3, now)).toEqual([
      { day: "2026-10-10", count: 0 },
      { day: "2026-10-11", count: 1 },
      { day: "2026-10-12", count: 2 },
    ]);
  });

  it("counts timestamps since a point in time", () => {
    expect(countSince([1, 5, 10], 5)).toBe(2);
  });

  it("breaks elections down by effective status", () => {
    const base = { status: "published", paused: false, startsAt: now - DAY_MS, endsAt: now + DAY_MS } as const;
    const elections = [
      base,
      { ...base, paused: true },
      { ...base, status: "draft" as const },
      { ...base, startsAt: now + DAY_MS, endsAt: now + 2 * DAY_MS },
      { ...base, endsAt: now - 1 },
    ] as Pick<Election, "status" | "paused" | "startsAt" | "endsAt">[];
    expect(statusBreakdown(elections, now)).toEqual({ open: 1, paused: 1, draft: 1, scheduled: 1, closed: 1 });
  });

  it("computes turnout and averages safely", () => {
    expect(turnoutPercent(87, 100)).toBe(87);
    expect(turnoutPercent(5, 0)).toBe(0);
    expect(average([50, 75])).toBe(63);
    expect(average([])).toBeNull();
  });
});

describe("rate limit keys", () => {
  it("normalises emails so lookups match what the routes stored", () => {
    expect(RATE_KEYS.voterAuthEmail("e1", " Ada@Example.com ")).toBe("voter-auth-email:e1:ada@example.com");
    expect(RATE_KEYS.resendEmail("e1", "ADA@example.com")).toBe("resend-email:e1:ada@example.com");
  });

  it("derives the kind from the key prefix", () => {
    expect(rateKind("voter-auth-email:e1:ada@example.com")).toBe("voter-auth-email");
    expect(rateKind("session:1.2.3.4")).toBe("session");
    expect(rateKind("nocolon")).toBe("nocolon");
  });

  it("builds every key a voter or IP can be limited by", () => {
    expect(voterRateKeys("e1", "ada@example.com", "v1")).toEqual([
      "voter-auth-email:e1:ada@example.com",
      "resend-email:e1:ada@example.com",
      "vote:e1:v1",
    ]);
    expect(ipRateKeys(" 1.2.3.4 ")).toEqual(["session:1.2.3.4", "voter-auth-ip:1.2.3.4", "resend-ip:1.2.3.4", "receipt:1.2.3.4"]);
  });
});

describe("platform config", () => {
  it("falls back to everything open", () => {
    expect(parsePlatformConfig(undefined)).toEqual(DEFAULT_PLATFORM_CONFIG);
    expect(parsePlatformConfig({})).toEqual(DEFAULT_PLATFORM_CONFIG);
  });

  it("only closes switches that are explicitly false", () => {
    const config = parsePlatformConfig({ signupsOpen: false, electionsOpen: "no" });
    expect(config.signupsOpen).toBe(false);
    expect(config.electionsOpen).toBe(true);
  });

  it("cleans the banner and email cap", () => {
    expect(parsePlatformConfig({ banner: { message: "   ", tone: "warning" } }).banner).toBeNull();
    expect(parsePlatformConfig({ banner: { message: " Hi ", tone: "odd" } }).banner).toEqual({ message: "Hi", tone: "info" });
    expect(parsePlatformConfig({ banner: { message: "x".repeat(500) } }).banner?.message).toHaveLength(MAX_BANNER_LENGTH);
    expect(parsePlatformConfig({ emailDailyCap: 300 }).emailDailyCap).toBe(300);
    expect(parsePlatformConfig({ emailDailyCap: -1 }).emailDailyCap).toBeNull();
    expect(parsePlatformConfig({ emailDailyCap: 2.5 }).emailDailyCap).toBeNull();
  });
});

describe("formatting helpers", () => {
  const now = 1_000_000_000_000;

  it("describes relative times in both directions", () => {
    expect(timeAgo(null, now)).toBe("never");
    expect(timeAgo(now - 30_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5m ago");
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
    expect(timeAgo(now + 2 * DAY_MS, now)).toBe("in 2d");
  });

  it("compacts large numbers", () => {
    expect(compactNumber(950)).toBe("950");
    expect(compactNumber(12_900)).toBe("12.9K");
  });

  it("labels support actions in election activity", () => {
    expect(auditLabel("team.ownership_transferred")).toBe("transferred ownership of the election");
    expect(auditLabel("something.new")).toBe("something.new");
    expect(describeAuditMeta({ action: "team.ownership_transferred", meta: { to: "new@example.com" } })).toBe("to new@example.com");
  });
});
