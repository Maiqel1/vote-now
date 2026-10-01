import { describe, expect, it } from "vitest";
import type { Ballot, Position } from "@/lib/types";
import { ballotReadinessIssues, ballotSchema, validateSelections } from "@/lib/validation";

function position(overrides: Partial<Position> & Pick<Position, "id" | "type">): Position {
  return {
    title: overrides.id,
    description: "",
    maxSelections: 1,
    allowAbstain: false,
    candidates: [
      { id: `${overrides.id}aaa1`, name: "A", bio: "", photoUrl: null },
      { id: `${overrides.id}bbb2`, name: "B", bio: "", photoUrl: null },
      { id: `${overrides.id}ccc3`, name: "C", bio: "", photoUrl: null },
    ],
    ...overrides,
  };
}

const ballot: Ballot = {
  updatedAt: 0,
  positions: [
    position({ id: "pres01", type: "single", allowAbstain: true }),
    position({ id: "coun01", type: "multi", maxSelections: 2 }),
    position({ id: "vice01", type: "yesno", candidates: [{ id: "vice01aaa1", name: "V", bio: "", photoUrl: null }] }),
  ],
};

describe("validateSelections", () => {
  it("accepts a complete valid ballot", () => {
    const result = validateSelections(ballot, { pres01: ["pres01aaa1"], coun01: ["coun01aaa1", "coun01bbb2"], vice01: ["yes"] }, true);
    expect(result).toEqual({
      ok: true,
      selections: { pres01: ["pres01aaa1"], coun01: ["coun01aaa1", "coun01bbb2"], vice01: ["yes"] },
    });
  });

  it("treats skipped positions as abstentions when not required", () => {
    const result = validateSelections(ballot, { pres01: ["pres01aaa1"] }, false);
    expect(result.ok && result.selections).toEqual({ pres01: ["pres01aaa1"], coun01: [], vice01: [] });
  });

  it("rejects skipped positions when every position is required", () => {
    expect(validateSelections(ballot, { pres01: ["pres01aaa1"] }, true).ok).toBe(false);
  });

  it("allows explicit abstain only where enabled", () => {
    expect(validateSelections(ballot, { pres01: ["abstain"] }, false).ok).toBe(true);
    expect(validateSelections(ballot, { coun01: ["abstain"] }, false).ok).toBe(false);
  });

  it("rejects candidates from another position", () => {
    expect(validateSelections(ballot, { pres01: ["coun01aaa1"] }, false).ok).toBe(false);
  });

  it("rejects two choices for a single-choice position", () => {
    expect(validateSelections(ballot, { pres01: ["pres01aaa1", "pres01bbb2"] }, false).ok).toBe(false);
  });

  it("rejects more than the maximum on multi-choice positions", () => {
    expect(validateSelections(ballot, { coun01: ["coun01aaa1", "coun01bbb2", "coun01ccc3"] }, false).ok).toBe(false);
  });

  it("collapses duplicate choices so a candidate can't be voted twice", () => {
    const result = validateSelections(ballot, { coun01: ["coun01aaa1", "coun01aaa1"] }, false);
    expect(result.ok && result.selections.coun01).toEqual(["coun01aaa1"]);
  });

  it("only accepts yes or no for yes/no positions", () => {
    expect(validateSelections(ballot, { vice01: ["maybe"] }, false).ok).toBe(false);
    expect(validateSelections(ballot, { vice01: ["vice01aaa1"] }, false).ok).toBe(false);
  });

  it("rejects unknown positions and malformed input", () => {
    expect(validateSelections(ballot, { nope99: ["x"] }, false).ok).toBe(false);
    expect(validateSelections(ballot, null, false).ok).toBe(false);
    expect(validateSelections(ballot, { pres01: "pres01aaa1" }, false).ok).toBe(false);
    expect(validateSelections(ballot, [], false).ok).toBe(false);
  });
});

describe("ballotSchema", () => {
  it("forces maxSelections to 1 for non-multi positions", () => {
    const parsed = ballotSchema.parse({ positions: [position({ id: "pres01", type: "single", maxSelections: 3 })] });
    expect(parsed.positions[0].maxSelections).toBe(1);
  });

  it("rejects yes/no positions with several candidates", () => {
    expect(ballotSchema.safeParse({ positions: [position({ id: "vice01", type: "yesno" })] }).success).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const a = position({ id: "pres01", type: "single" });
    expect(ballotSchema.safeParse({ positions: [a, a] }).success).toBe(false);
  });
});

describe("ballotReadinessIssues", () => {
  it("requires positions with candidates", () => {
    expect(ballotReadinessIssues({ positions: [], updatedAt: 0 })).toHaveLength(1);
    expect(ballotReadinessIssues({ positions: [position({ id: "pres01", type: "single", candidates: [] })], updatedAt: 0 })).toHaveLength(1);
    expect(ballotReadinessIssues(ballot)).toEqual([]);
  });
});
