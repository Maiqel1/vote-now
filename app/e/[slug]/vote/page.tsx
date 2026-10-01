import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/public/Countdown";
import { PublicShell } from "@/components/public/PublicShell";
import { VoteFlow } from "@/components/public/VoteFlow";
import { readVoterSession } from "@/lib/auth/voter-session";
import { areResultsPublic, getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime, maskName } from "@/lib/format";
import { getBallot, votersCol } from "@/lib/server/elections";
import { loadPublicElection } from "@/lib/server/public-election";
import type { Voter } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vote", robots: { index: false } };

function StateCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl animate-slide-up py-8 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-amber-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        {eyebrow}
      </div>
      <h1 className="mb-6 font-playfair text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
      {children}
    </div>
  );
}

export default async function VotePage({ params, searchParams }: { params: { slug: string }; searchParams: { t?: string } }) {
  const loaded = await loadPublicElection(params.slug);
  if (!loaded || loaded.preview) notFound();
  const { election } = loaded;
  const status = getEffectiveStatus(election);

  if (status === "scheduled") {
    return (
      <PublicShell election={election}>
        <StateCard eyebrow="Not open yet" title="Voting hasn't started">
          <p className="mb-8 text-muted-foreground">Voting opens {formatDateTime(election.startsAt, election.timezone)}. Keep your invitation email; you&apos;ll need it.</p>
          <Countdown target={election.startsAt} label="Opens in" />
        </StateCard>
      </PublicShell>
    );
  }

  if (status === "closed") {
    const resultsPublic = areResultsPublic(election);
    return (
      <PublicShell election={election}>
        <StateCard eyebrow="Polls closed" title="Voting has ended">
          <p className="mb-8 text-muted-foreground">
            Voting closed {formatDateTime(election.endsAt, election.timezone)}. Thank you to everyone who took part.
          </p>
          <div className="flex justify-center gap-3">
            {resultsPublic && (
              <Link href={`/e/${election.slug}/results`} className="btn-primary text-sm">
                View results
              </Link>
            )}
            <Link href={`/e/${election.slug}`} className="btn-ghost text-sm">
              Election page
            </Link>
          </div>
        </StateCard>
      </PublicShell>
    );
  }

  if (status === "paused") {
    return (
      <PublicShell election={election}>
        <StateCard eyebrow="Paused" title="Voting is paused">
          <p className="text-muted-foreground">The organizers have temporarily paused voting. Your link still works. Please try again shortly.</p>
        </StateCard>
      </PublicShell>
    );
  }

  const ballot = await getBallot(election.id);
  const voterId = await readVoterSession(election.id);
  let sessionVoter: string | null = null;
  if (voterId) {
    const snap = await votersCol(election.id).doc(voterId).get();
    const voter = snap.data() as Voter | undefined;
    if (voter && !voter.hasVoted) sessionVoter = maskName(voter.name, voter.email);
  }

  return (
    <PublicShell election={election}>
      <VoteFlow
        slug={election.slug}
        title={election.title}
        positions={ballot.positions}
        shuffleCandidates={election.ballotOptions.shuffle}
        requireAll={election.ballotOptions.requireAll}
        token={typeof searchParams.t === "string" && searchParams.t.length > 10 ? searchParams.t : null}
        sessionVoter={sessionVoter}
      />
    </PublicShell>
  );
}
