import * as dotenv from "dotenv";
import { randomId } from "../lib/crypto";
import { adminAuth, adminDb } from "../lib/firebase-admin";
import type { Ballot, Election, Position } from "../lib/types";

dotenv.config({ path: ".env.local" });

const LEGACY_POSITIONS: { key: string; title: string; candidates: { legacyId: string; name: string }[] }[] = [
  {
    key: "president",
    title: "President",
    candidates: [
      { legacyId: "1", name: "Alhassan Usman Adam" },
      { legacyId: "2", name: "Ohuoba Nosamudiana David" },
    ],
  },
  { key: "vicePresident", title: "Vice President", candidates: [{ legacyId: "3", name: "Ikejiaku Miracle" }] },
  { key: "secretaryGeneral", title: "Secretary General", candidates: [{ legacyId: "4", name: "Bello Alimat Ayomide" }] },
  { key: "directorOfSport", title: "Director of Sport", candidates: [{ legacyId: "5", name: "Akintan Ayomide" }] },
  { key: "directorOfSocials", title: "Director of Socials", candidates: [{ legacyId: "6", name: "Oladipupo Demilade Christiana" }] },
];

function arg(name: string, fallback?: string): string | undefined {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
}

async function main() {
  const ownerEmail = arg("owner");
  const slug = arg("slug", "shmc-2025")!;
  const title = arg("title", "SHMC Elections 2025")!;
  const orgName = arg("org", "SHMC")!;
  const dryRun = process.argv.includes("--dry-run");

  if (!ownerEmail) {
    console.error("Usage: npm run migrate-2025 -- --owner=you@example.com [--slug=shmc-2025] [--title=...] [--org=...] [--dry-run]");
    process.exit(1);
  }

  const db = adminDb();
  const owner = await adminAuth().getUserByEmail(ownerEmail);
  const ownerProfile = await db.collection("users").doc(owner.uid).get();
  if (!ownerProfile.exists) {
    console.error(`${ownerEmail} has a Firebase account but hasn't signed in to the new VoteNow yet. Log in once, then rerun.`);
    process.exit(1);
  }
  if ((await db.collection("slugs").doc(slug).get()).exists) {
    console.error(`The slug "${slug}" is already taken. Nothing was changed.`);
    process.exit(1);
  }

  const [voteSnap, voterSnap] = await Promise.all([db.collection("votes").get(), db.collection("voters").get()]);
  const legacyVotes: Record<string, Record<string, number>> = {};
  voteSnap.docs.forEach((d) => (legacyVotes[d.id] = d.data() as Record<string, number>));

  const voters = voterSnap.docs.map((d) => d.data());
  const voted = voters.filter((v) => v.hasVoted);
  const votedTimes = voted.map((v) => Date.parse(v.votedAt)).filter((t) => !Number.isNaN(t));
  const createdTimes = voters.map((v) => Date.parse(v.createdAt)).filter((t) => !Number.isNaN(t));
  const endsAt = votedTimes.length ? Math.max(...votedTimes) + 60_000 : Date.now();
  const startsAt = votedTimes.length ? Math.min(...votedTimes) - 60_000 : endsAt - 8 * 60 * 60 * 1000;

  const counts: Record<string, Record<string, number>> = {};
  const positions: Position[] = LEGACY_POSITIONS.map((legacy) => {
    const positionId = randomId(10);
    counts[positionId] = {};
    const candidates = legacy.candidates.map((c) => {
      const candidateId = randomId(10);
      counts[positionId][candidateId] = legacyVotes[legacy.key]?.[c.legacyId] ?? 0;
      return { id: candidateId, name: c.name, bio: "", photoUrl: null };
    });
    return {
      id: positionId,
      title: legacy.title,
      description: "",
      type: "single",
      maxSelections: 1,
      allowAbstain: false,
      candidates,
    };
  });

  const positionTotals = Object.values(counts).map((c) => Object.values(c).reduce((a, b) => a + b, 0));
  const totalBallots = voted.length || Math.max(0, ...positionTotals);

  const ref = db.collection("elections").doc();
  const now = Date.now();
  const election: Omit<Election, "id"> = {
    slug,
    title,
    orgName,
    description: "Imported from the original VoteNow 2025 election.",
    logoUrl: null,
    accentColor: null,
    ownerId: owner.uid,
    members: { [owner.uid]: "owner" },
    memberIds: [owner.uid],
    status: "published",
    paused: false,
    startsAt,
    endsAt,
    timezone: "Africa/Lagos",
    results: { visibility: "afterClose", publishedAt: null },
    ballotOptions: { shuffle: false, requireAll: true },
    lockedAt: startsAt,
    reminderRound: 0,
    inviteMessage: "",
    counts: { voters: voters.length, invited: voters.filter((v) => v.emailSent).length },
    piiPurgedAt: now,
    createdAt: Math.min(now, ...createdTimes),
    updatedAt: now,
  };
  const ballot: Ballot = { positions, updatedAt: now };

  console.log(`\nMigrating to /e/${slug} (election ${ref.id})`);
  console.log(`  Owner:     ${ownerEmail}`);
  console.log(`  Window:    ${new Date(startsAt).toISOString()} → ${new Date(endsAt).toISOString()}`);
  console.log(`  Voters:    ${voters.length} registered, ${voted.length} voted`);
  positions.forEach((p, i) => {
    const line = p.candidates.map((c) => `${c.name}: ${counts[p.id][c.id]}`).join(", ");
    console.log(`  ${LEGACY_POSITIONS[i].title.padEnd(20)} ${line}`);
  });
  console.log("  Voter names and emails are NOT copied. Only aggregate counts are kept.");

  if (dryRun) {
    console.log("\nDry run: nothing written.\n");
    return;
  }

  const batch = db.batch();
  batch.create(db.collection("slugs").doc(slug), { electionId: ref.id });
  batch.create(ref, election);
  batch.create(ref.collection("ballot").doc("current"), ballot);
  batch.create(ref.collection("tallies").doc("0"), { counts, total: totalBallots });
  batch.create(ref.collection("audit").doc(), {
    actorUid: null,
    actorName: "System",
    action: "election.created",
    meta: { migratedFrom: "legacy-2025" },
    at: now,
  });
  await batch.commit();
  console.log(`\nDone. Visit /e/${slug}/results\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
