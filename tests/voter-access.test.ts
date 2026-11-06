import { describe, expect, it } from "vitest";
import { FREE_PLAN, GOOGLE_VOTER_CEILING, limitsForAccess, resolveLimits } from "@/lib/plans";
import { RATE_KEYS } from "@/lib/rate-limit-keys";
import {
  canChangeVoterAccess,
  emailKeyOf,
  googleVoterDecision,
  voterAccessChangeProblem,
  voterAccessOf,
} from "@/lib/voter-access";

describe("emailKeyOf", () => {
  it("ignores dots, plus tags and case for Gmail", () => {
    expect(emailKeyOf("Ada.Obi+votes@Gmail.com")).toBe("adaobi@gmail.com");
    expect(emailKeyOf(" a.d.a.o.b.i@gmail.com ")).toBe("adaobi@gmail.com");
  });

  it("treats googlemail.com as gmail.com", () => {
    expect(emailKeyOf("ada.obi@googlemail.com")).toBe("adaobi@gmail.com");
  });

  it("only lowercases other domains", () => {
    expect(emailKeyOf("Ada.Obi+x@School.edu")).toBe("ada.obi+x@school.edu");
    expect(emailKeyOf("ada.obi@gmail.com.ng")).toBe("ada.obi@gmail.com.ng");
  });
});

describe("voter access", () => {
  it("reads anything unknown as email", () => {
    expect(voterAccessOf("google")).toBe("google");
    expect(voterAccessOf(undefined)).toBe("email");
    expect(voterAccessOf("GOOGLE")).toBe("email");
  });

  it("lifts the voter limit to the ceiling only for Google sign-in", () => {
    expect(limitsForAccess(FREE_PLAN, "email")).toEqual(FREE_PLAN);
    const google = limitsForAccess(FREE_PLAN, "google");
    expect(google.votersPerElection).toBe(GOOGLE_VOTER_CEILING);
    expect(google.activeElections).toBe(FREE_PLAN.activeElections);
  });

  it("keeps a custom limit that is already above the ceiling", () => {
    const custom = resolveLimits({ votersPerElection: 5000 });
    expect(limitsForAccess(custom, "google").votersPerElection).toBe(GOOGLE_VOTER_CEILING);
    const big = { ...FREE_PLAN, votersPerElection: GOOGLE_VOTER_CEILING * 2 };
    expect(limitsForAccess(big, "google").votersPerElection).toBe(big.votersPerElection);
  });

  it("can change only before voting opens", () => {
    expect(canChangeVoterAccess("draft")).toBe(true);
    expect(canChangeVoterAccess("scheduled")).toBe(true);
    expect(canChangeVoterAccess("open")).toBe(false);
    expect(canChangeVoterAccess("paused")).toBe(false);
    expect(canChangeVoterAccess("closed")).toBe(false);
  });

  it("refuses switching to email when the list is over the email limit", () => {
    expect(voterAccessChangeProblem({ target: "google", status: "draft", voters: 5000, emailLimit: 200 })).toBeNull();
    expect(voterAccessChangeProblem({ target: "email", status: "draft", voters: 200, emailLimit: 200 })).toBeNull();
    expect(voterAccessChangeProblem({ target: "email", status: "draft", voters: 201, emailLimit: 200 })).toMatch(/more than email/);
    expect(voterAccessChangeProblem({ target: "google", status: "open", voters: 10, emailLimit: 200 })).toMatch(/locked/);
  });
});

describe("googleVoterDecision", () => {
  const verified = { email: "ada@gmail.com", emailVerified: true };

  it("lets a listed voter in", () => {
    expect(googleVoterDecision(verified, { id: "v1", hasVoted: false })).toEqual({ ok: true, voterId: "v1" });
  });

  it("refuses unverified accounts, unlisted emails and repeat voters", () => {
    expect(googleVoterDecision({ email: "ada@gmail.com", emailVerified: false }, { id: "v1", hasVoted: false })).toEqual({
      ok: false,
      reason: "unverified",
    });
    expect(googleVoterDecision({ email: null, emailVerified: true }, null)).toEqual({ ok: false, reason: "unverified" });
    expect(googleVoterDecision(verified, null)).toEqual({ ok: false, reason: "notListed" });
    expect(googleVoterDecision(verified, { id: "v1", hasVoted: true })).toEqual({ ok: false, reason: "alreadyVoted" });
  });
});

describe("Google rate limit keys", () => {
  it("matches the same Gmail account however it is written", () => {
    expect(RATE_KEYS.voterGoogleEmail("e1", "Ada.Obi@gmail.com")).toBe(RATE_KEYS.voterGoogleEmail("e1", "adaobi@googlemail.com"));
    expect(RATE_KEYS.voterGoogleIp("1.2.3.4")).toBe("voter-google-ip:1.2.3.4");
    expect(RATE_KEYS.voterLinkIp("1.2.3.4")).toBe("voter-link-ip:1.2.3.4");
  });
});
