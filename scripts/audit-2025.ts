import * as dotenv from "dotenv";
import { adminDb } from "../lib/firebase-admin";

dotenv.config({ path: ".env.local" });

type Counts = Record<string, Record<string, number>>;

interface VoterRecord {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt?: string;
  hasVoted?: boolean;
  votedAt?: string;
  votes?: Record<string, string>;
}

function bump(counts: Counts, position: string, candidateId: string) {
  counts[position] ??= {};
  counts[position][candidateId] = (counts[position][candidateId] ?? 0) + 1;
}

async function main() {
  const db = adminDb();
  const [voterSnap, voteSnap] = await Promise.all([
    db.collection("voters").get(),
    db.collection("votes").get(),
  ]);

  const voters: VoterRecord[] = voterSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VoterRecord, "id">) }));
  const stored: Counts = {};
  voteSnap.docs.forEach((d) => {
    stored[d.id] = d.data() as Record<string, number>;
  });

  const recount: Counts = {};
  const votedWithoutBallot: string[] = [];
  const ballotWithoutVoted: string[] = [];
  const missingFields: string[] = [];
  const idMismatch: string[] = [];

  for (const voter of voters) {
    if (voter.votes) {
      for (const [position, candidateId] of Object.entries(voter.votes)) {
        if (candidateId) bump(recount, position, candidateId);
      }
    }
    if (voter.hasVoted && !voter.votes) votedWithoutBallot.push(voter.id);
    if (voter.votes && !voter.hasVoted) ballotWithoutVoted.push(voter.id);
    if (!voter.firstName || !voter.createdAt || !voter.phoneNumber) missingFields.push(voter.id);
    if (voter.email && voter.email !== voter.id) idMismatch.push(voter.id);
  }

  const hasVotedCount = voters.filter((v) => v.hasVoted).length;

  console.log("\n=== 2025 election audit ===\n");
  console.log(`Voter records:            ${voters.length}`);
  console.log(`Marked hasVoted:          ${hasVotedCount}`);
  console.log(`Voter records with votes: ${voters.filter((v) => v.votes).length}\n`);

  let mismatches = 0;
  const positions = Array.from(new Set([...Object.keys(stored), ...Object.keys(recount)])).sort();

  for (const position of positions) {
    const storedCounts = stored[position] ?? {};
    const recounted = recount[position] ?? {};
    const candidates = Array.from(new Set([...Object.keys(storedCounts), ...Object.keys(recounted)])).sort();
    const storedTotal = Object.values(storedCounts).reduce((a, b) => a + b, 0);

    console.log(`[${position}] stored total ${storedTotal}, voters marked hasVoted ${hasVotedCount}`);
    for (const candidateId of candidates) {
      const s = storedCounts[candidateId] ?? 0;
      const r = recounted[candidateId] ?? 0;
      const flag = s === r ? "ok" : `MISMATCH (${s - r > 0 ? "+" : ""}${s - r})`;
      if (s !== r) mismatches++;
      console.log(`  candidate ${candidateId.padEnd(4)} stored ${String(s).padStart(5)}  recounted ${String(r).padStart(5)}  ${flag}`);
    }
    if (storedTotal !== hasVotedCount) {
      console.log(`  WARNING: stored total differs from hasVoted count by ${storedTotal - hasVotedCount}`);
    }
    console.log("");
  }

  const section = (title: string, ids: string[]) => {
    console.log(`${title}: ${ids.length}`);
    ids.slice(0, 50).forEach((id) => console.log(`  - ${id}`));
    if (ids.length > 50) console.log(`  ...and ${ids.length - 50} more`);
  };

  section("hasVoted but no stored ballot", votedWithoutBallot);
  section("Stored ballot but hasVoted is false", ballotWithoutVoted);
  section("Missing registration fields (firstName/createdAt/phoneNumber)", missingFields);
  section("Document ID differs from email field", idMismatch);

  console.log(
    `\nResult: ${mismatches === 0 ? "tallies match the per-voter ballots" : `${mismatches} candidate tallies do not match the per-voter ballots`}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
