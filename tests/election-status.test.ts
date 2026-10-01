import { describe, expect, it } from "vitest";
import { areResultsPublic, canPublishResultsManually, getEffectiveStatus, isBallotLocked } from "@/lib/election-status";
import type { Election, ResultsVisibility } from "@/lib/types";

const START = 1_000_000;
const END = 2_000_000;

function election(overrides: Partial<Election> = {}): Election {
  return {
    status: "published",
    paused: false,
    startsAt: START,
    endsAt: END,
    lockedAt: null,
    results: { visibility: "afterClose", publishedAt: null },
    ...overrides,
  } as Election;
}

describe("getEffectiveStatus", () => {
  it("is draft regardless of time when unpublished", () => {
    expect(getEffectiveStatus(election({ status: "draft" }), START + 1)).toBe("draft");
  });

  it("is scheduled before start", () => {
    expect(getEffectiveStatus(election(), START - 1)).toBe("scheduled");
  });

  it("opens exactly at startsAt", () => {
    expect(getEffectiveStatus(election(), START)).toBe("open");
  });

  it("closes exactly at endsAt", () => {
    expect(getEffectiveStatus(election(), END - 1)).toBe("open");
    expect(getEffectiveStatus(election(), END)).toBe("closed");
  });

  it("is paused while open and paused", () => {
    expect(getEffectiveStatus(election({ paused: true }), START + 5)).toBe("paused");
  });

  it("reports closed even if paused after the end", () => {
    expect(getEffectiveStatus(election({ paused: true }), END + 5)).toBe("closed");
  });

  it("stays scheduled if paused before start", () => {
    expect(getEffectiveStatus(election({ paused: true }), START - 5)).toBe("scheduled");
  });
});

describe("areResultsPublic", () => {
  const cases: [ResultsVisibility, number, number | null, boolean][] = [
    ["live", START + 1, null, true],
    ["live", START - 1, null, true],
    ["afterClose", START + 1, null, false],
    ["afterClose", END, null, true],
    ["manual", END + 1, null, false],
    ["manual", END + 1, END + 2, true],
    ["private", END + 1, null, false],
  ];

  it.each(cases)("%s at %d (published %s) → %s", (visibility, now, publishedAt, expected) => {
    expect(areResultsPublic(election({ results: { visibility, publishedAt } }), now)).toBe(expected);
  });

  it("never shows results for a draft", () => {
    expect(areResultsPublic(election({ status: "draft", results: { visibility: "live", publishedAt: null } }), END + 1)).toBe(false);
  });
});

describe("canPublishResultsManually", () => {
  it("only after close, in manual mode, once", () => {
    const manual = { results: { visibility: "manual" as const, publishedAt: null } };
    expect(canPublishResultsManually(election(manual), START + 1)).toBe(false);
    expect(canPublishResultsManually(election(manual), END + 1)).toBe(true);
    expect(canPublishResultsManually(election({ results: { visibility: "manual", publishedAt: 5 } }), END + 1)).toBe(false);
    expect(canPublishResultsManually(election(), END + 1)).toBe(false);
  });
});

describe("isBallotLocked", () => {
  it("is unlocked for drafts and scheduled elections", () => {
    expect(isBallotLocked(election({ status: "draft" }), START + 1)).toBe(false);
    expect(isBallotLocked(election(), START - 1)).toBe(false);
  });

  it("locks once voting opens", () => {
    expect(isBallotLocked(election(), START)).toBe(true);
    expect(isBallotLocked(election({ paused: true }), START + 1)).toBe(true);
    expect(isBallotLocked(election(), END + 1)).toBe(true);
  });

  it("stays locked once a vote was cast, even if moved back to draft", () => {
    expect(isBallotLocked(election({ status: "draft", lockedAt: START + 1 }), START - 100)).toBe(true);
  });
});
