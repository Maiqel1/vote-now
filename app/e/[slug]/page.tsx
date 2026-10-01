import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateAvatar } from "@/components/election/CandidateAvatar";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Notice } from "@/components/feedback/Notice";
import { Countdown } from "@/components/public/Countdown";
import { PublicShell } from "@/components/public/PublicShell";
import { positionHint } from "@/lib/ballot-display";
import { areResultsPublic, getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime } from "@/lib/format";
import { getBallot } from "@/lib/server/elections";
import { loadPublicElection } from "@/lib/server/public-election";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const loaded = await loadPublicElection(params.slug);
  if (!loaded) return { title: "Election not found" };
  const { election } = loaded;
  return {
    title: election.title,
    description: election.description || `${election.orgName} is running “${election.title}” on VoteNow.`,
    robots: loaded.preview ? { index: false } : undefined,
  };
}

export default async function ElectionHomePage({ params }: { params: { slug: string } }) {
  const loaded = await loadPublicElection(params.slug);
  if (!loaded) notFound();
  const { election, preview } = loaded;
  const ballot = await getBallot(election.id);
  const status = getEffectiveStatus(election);
  const resultsPublic = areResultsPublic(election);

  return (
    <PublicShell election={election}>
      {preview && (
        <Notice tone="warning" className="mb-6">
          Draft preview. Only your team can see this page until you publish the election.
        </Notice>
      )}

      <div className="mb-10 animate-slide-up text-center">
        <div className="mb-5 flex justify-center">
          <StatusBadge status={status} />
        </div>
        <h1 className="mb-4 font-playfair text-4xl font-bold leading-tight text-foreground md:text-5xl">{election.title}</h1>
        {election.description && (
          <p className="mx-auto mb-6 max-w-xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">{election.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatDateTime(election.startsAt, election.timezone)} → {formatDateTime(election.endsAt, election.timezone)}
        </p>
      </div>

      <div className="mb-12 flex animate-slide-up flex-col items-center gap-6 delay-100">
        {status === "scheduled" && <Countdown target={election.startsAt} label="Voting opens in" />}
        {status === "open" && <Countdown target={election.endsAt} label="Voting closes in" />}
        {status === "paused" && <Notice tone="warning">Voting is temporarily paused by the organizers. Please check back shortly.</Notice>}

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {(status === "open" || status === "paused") && (
            <Link href={`/e/${election.slug}/vote`} className="btn-primary text-sm">
              Vote now →
            </Link>
          )}
          {resultsPublic && (
            <Link href={`/e/${election.slug}/results`} className={status === "closed" ? "btn-primary text-sm" : "btn-ghost text-sm"}>
              {status === "closed" ? "View results" : "Live results"}
            </Link>
          )}
          {status === "closed" && !resultsPublic && <p className="text-sm text-muted-foreground">Voting has ended. Results will be announced by the organizers.</p>}
        </div>
        {(status === "open" || status === "paused" || status === "scheduled") && (
          <p className="max-w-md text-center text-xs text-muted-foreground">
            Only people on the voter list can vote. Use the personal link or code from your invitation email.
          </p>
        )}
      </div>

      {ballot.positions.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">On the ballot</h2>
          {ballot.positions.map((position) => (
            <div key={position.id} className="glass overflow-hidden rounded-2xl">
              <div className="border-b border-border/60 px-6 py-4">
                <h3 className="font-playfair text-lg font-bold">{position.title}</h3>
                {position.description && <p className="text-xs text-muted-foreground">{position.description}</p>}
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/60">{positionHint(position)}</p>
              </div>
              <div className="divide-y divide-border/40">
                {position.candidates.map((candidate) => (
                  <div key={candidate.id} className="flex gap-4 px-6 py-4">
                    <CandidateAvatar name={candidate.name} photoUrl={candidate.photoUrl} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                      {candidate.bio && <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{candidate.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Already voted?{" "}
        <Link href={`/e/${election.slug}/verify`} className="text-amber-400/80 hover:text-amber-300">
          Check your receipt
        </Link>
      </div>
    </PublicShell>
  );
}
