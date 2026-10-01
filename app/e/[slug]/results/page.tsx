import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/election/ResultsView";
import { PublicShell } from "@/components/public/PublicShell";
import { areResultsPublic, getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime } from "@/lib/format";
import { getBallot, getTally } from "@/lib/server/elections";
import { loadPublicElection } from "@/lib/server/public-election";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const loaded = await loadPublicElection(params.slug);
  return { title: loaded ? `Results · ${loaded.election.title}` : "Results" };
}

export default async function PublicResultsPage({ params }: { params: { slug: string } }) {
  const loaded = await loadPublicElection(params.slug);
  if (!loaded || loaded.preview) notFound();
  const { election } = loaded;
  const status = getEffectiveStatus(election);

  if (!areResultsPublic(election)) {
    const when =
      election.results.visibility === "afterClose"
        ? `Results will appear here when voting closes on ${formatDateTime(election.endsAt, election.timezone)}.`
        : election.results.visibility === "manual"
          ? "The organizers will publish the results here after voting closes."
          : "The organizers have chosen not to publish results online.";
    return (
      <PublicShell election={election}>
        <div className="mx-auto max-w-xl animate-fade-up py-8 text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-brand/40 bg-brand-soft">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="animate-spin [animation-duration:8s] text-brand-strong">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold">
            Results <span className="text-gradient">coming soon</span>
          </h1>
          <p className="mb-8 text-muted-foreground">{when}</p>
          <Link href={`/e/${election.slug}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            ← Election page
          </Link>
        </div>
      </PublicShell>
    );
  }

  const [ballot, tally] = await Promise.all([getBallot(election.id), getTally(election.id)]);
  const final = status === "closed";

  return (
    <PublicShell election={election}>
      <div className="mb-10 animate-fade-up text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-brand-strong">
          <span className={`inline-block h-1.5 w-1.5 rounded-full bg-brand ${final ? "" : "animate-pulse-soft"}`} />
          {final ? "Final results" : "Live results"}
        </div>
        <h1 className="mb-3 text-4xl font-bold md:text-5xl">{election.title}</h1>
        {!final && <p className="text-sm text-muted-foreground">Voting is still open. These numbers will change.</p>}
      </div>
      <ResultsView
        electionId={election.id}
        ballot={ballot}
        initialTally={tally}
        eligibleVoters={election.counts.voters}
        live={!final}
        requireAuth={false}
        final={final}
      />
    </PublicShell>
  );
}
