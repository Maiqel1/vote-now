import { describe, expect, it } from "vitest";
import { computeResults, sumShards, tallyIncrements } from "@/lib/results";
import type { Ballot, Position } from "@/lib/types";

function position(id: string, type: Position["type"], candidates: string[], maxSelections = 1): Position {
  return {
    id,
    title: id,
    description: "",
    type,
    maxSelections,
    allowAbstain: true,
    candidates: candidates.map((c) => ({ id: c, name: c.toUpperCase(), bio: "", photoUrl: null })),
  };
}

const ballot: Ballot = {
  updatedAt: 0,
  positions: [
    position("pres", "single", ["ada", "bob", "cy"]),
    position("council", "multi", ["d1", "d2", "d3", "d4"], 2),
    position("vp", "yesno", ["vic"]),
  ],
};

describe("tallyIncrements", () => {
  it("counts choices and treats empty selections as abstain", () => {
    expect(tallyIncrements({ pres: ["ada"], council: ["d1", "d2"], vp: [] })).toEqual({
      pres: { ada: 1 },
      council: { d1: 1, d2: 1 },
      vp: { abstain: 1 },
    });
  });
});

describe("sumShards", () => {
  it("adds counts and totals across shards", () => {
    const total = sumShards([
      { counts: { pres: { ada: 2 } }, total: 2 },
      { counts: { pres: { ada: 1, bob: 4 }, vp: { yes: 3 } }, total: 5 },
      {},
    ]);
    expect(total).toEqual({ counts: { pres: { ada: 3, bob: 4 }, vp: { yes: 3 } }, total: 7 });
  });
});

describe("computeResults", () => {
  it("picks a single winner and computes shares of participating voters", () => {
    const r = computeResults(ballot, { total: 10, counts: { pres: { ada: 6, bob: 3, abstain: 1 } } });
    const pres = r.positions[0];
    expect(pres.winners).toEqual(["ada"]);
    expect(pres.tiedIds).toEqual([]);
    expect(pres.participating).toBe(9);
    expect(pres.abstained).toBe(1);
    expect(pres.entries[0].share).toBeCloseTo((6 / 9) * 100);
  });

  it("flags a tie for a single seat", () => {
    const r = computeResults(ballot, { total: 8, counts: { pres: { ada: 4, bob: 4 } } });
    expect(r.positions[0].winners).toEqual([]);
    expect(r.positions[0].tiedIds.sort()).toEqual(["ada", "bob"]);
  });

  it("elects the top N for multi-seat positions", () => {
    const r = computeResults(ballot, { total: 10, counts: { council: { d1: 7, d2: 5, d3: 2, d4: 1 } } });
    expect(r.positions[1].winners).toEqual(["d1", "d2"]);
  });

  it("flags a tie on the last multi seat but keeps clear winners", () => {
    const r = computeResults(ballot, { total: 10, counts: { council: { d1: 7, d2: 4, d3: 4, d4: 1 } } });
    expect(r.positions[1].winners).toEqual(["d1"]);
    expect(r.positions[1].tiedIds.sort()).toEqual(["d2", "d3"]);
  });

  it("does not declare winners with zero votes", () => {
    const r = computeResults(ballot, { total: 0, counts: {} });
    expect(r.positions[0].winners).toEqual([]);
    expect(r.positions[2].passed).toBeNull();
  });

  it("approves yes/no positions by simple majority", () => {
    expect(computeResults(ballot, { total: 5, counts: { vp: { yes: 3, no: 2 } } }).positions[2].passed).toBe(true);
    expect(computeResults(ballot, { total: 5, counts: { vp: { yes: 2, no: 3 } } }).positions[2].passed).toBe(false);
    const tie = computeResults(ballot, { total: 4, counts: { vp: { yes: 2, no: 2 } } }).positions[2];
    expect(tie.passed).toBe(false);
    expect(tie.tiedIds).toEqual(["vic"]);
  });
});
