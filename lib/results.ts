import { ABSTAIN } from "./validation";
import type { Ballot, Candidate, Position, Selections, TallyShard } from "./types";

export interface CandidateResult {
  candidate: Candidate;
  votes: number;
  share: number;
}

export interface PositionResult {
  position: Position;
  participating: number;
  abstained: number;
  entries: CandidateResult[];
  winners: string[];
  tiedIds: string[];
  yes: number;
  no: number;
  passed: boolean | null;
}

export interface ElectionResults {
  totalBallots: number;
  positions: PositionResult[];
}

export function emptyTally(): TallyShard {
  return { counts: {}, total: 0 };
}

export function sumShards(shards: Partial<TallyShard>[]): TallyShard {
  const result = emptyTally();
  for (const shard of shards) {
    result.total += shard.total ?? 0;
    for (const [positionId, counts] of Object.entries(shard.counts ?? {})) {
      result.counts[positionId] ??= {};
      for (const [key, n] of Object.entries(counts)) {
        result.counts[positionId][key] = (result.counts[positionId][key] ?? 0) + n;
      }
    }
  }
  return result;
}

export function tallyIncrements(selections: Selections): Record<string, Record<string, number>> {
  const increments: Record<string, Record<string, number>> = {};
  for (const [positionId, choices] of Object.entries(selections)) {
    increments[positionId] = {};
    if (choices.length === 0) increments[positionId][ABSTAIN] = 1;
    for (const choice of choices) increments[positionId][choice] = 1;
  }
  return increments;
}

function share(votes: number, of: number): number {
  return of === 0 ? 0 : (votes / of) * 100;
}

export function computeResults(ballot: Ballot, tally: TallyShard): ElectionResults {
  const positions = ballot.positions.map((position): PositionResult => {
    const counts = tally.counts[position.id] ?? {};
    const abstained = counts[ABSTAIN] ?? 0;
    const participating = Math.max(tally.total - abstained, 0);

    if (position.type === "yesno") {
      const yes = counts.yes ?? 0;
      const no = counts.no ?? 0;
      const candidate = position.candidates[0];
      const tie = yes === no && yes > 0;
      return {
        position,
        participating,
        abstained,
        entries: candidate ? [{ candidate, votes: yes, share: share(yes, yes + no) }] : [],
        winners: candidate && yes > no ? [candidate.id] : [],
        tiedIds: tie && candidate ? [candidate.id] : [],
        yes,
        no,
        passed: yes + no === 0 ? null : yes > no,
      };
    }

    const entries = position.candidates
      .map((candidate) => {
        const votes = counts[candidate.id] ?? 0;
        return { candidate, votes, share: share(votes, participating) };
      })
      .sort((a, b) => b.votes - a.votes);

    const seats = position.type === "single" ? 1 : position.maxSelections;
    const withVotes = entries.filter((e) => e.votes > 0);
    let winners: string[];
    let tiedIds: string[] = [];

    if (withVotes.length <= seats) {
      winners = withVotes.map((e) => e.candidate.id);
    } else {
      const cutoff = withVotes[seats - 1].votes;
      const above = withVotes.filter((e) => e.votes > cutoff);
      const atCutoff = withVotes.filter((e) => e.votes === cutoff);
      if (above.length + atCutoff.length > seats) {
        winners = above.map((e) => e.candidate.id);
        tiedIds = atCutoff.map((e) => e.candidate.id);
      } else {
        winners = [...above, ...atCutoff].map((e) => e.candidate.id);
      }
    }

    return { position, participating, abstained, entries, winners, tiedIds, yes: 0, no: 0, passed: null };
  });

  return { totalBallots: tally.total, positions };
}
