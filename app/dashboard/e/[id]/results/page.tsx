import { LifecycleControls } from "@/components/dashboard/LifecycleControls";
import { ResultsExport } from "@/components/dashboard/ResultsExport";
import { ResultsView } from "@/components/election/ResultsView";
import { Notice } from "@/components/feedback/Notice";
import { VISIBILITY_OPTIONS } from "@/lib/visibility";
import { areResultsPublic, getEffectiveStatus } from "@/lib/election-status";
import { getBallot, getTally } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";

export const metadata = { title: "Results" };

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);
  const [ballot, tally] = await Promise.all([getBallot(election.id), getTally(election.id)]);
  const status = getEffectiveStatus(election);
  const visibility = VISIBILITY_OPTIONS.find((o) => o.value === election.results.visibility);
  const isPublic = areResultsPublic(election);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Public visibility: <span className="text-foreground">{visibility?.title}</span>
          {isPublic ? " · visible to everyone now" : " · not public yet"}
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "closed" && election.results.visibility === "manual" && election.results.publishedAt === null && (
            <LifecycleControls
              electionId={election.id}
              status={status}
              endsAt={election.endsAt}
              canEdit={canEdit}
              ready
              visibility={election.results.visibility}
              resultsPublished={false}
            />
          )}
          <ResultsExport ballot={ballot} tally={tally} title={election.title} />
        </div>
      </div>

      {status === "draft" || status === "scheduled" ? (
        <Notice tone="info">Results appear here once voting opens.</Notice>
      ) : (
        <>
          {status !== "closed" && (
            <Notice tone="warning">Voting is still in progress. These numbers are provisional and only visible to your team.</Notice>
          )}
          <ResultsView
            electionId={election.id}
            ballot={ballot}
            initialTally={tally}
            eligibleVoters={election.counts.voters}
            live={status === "open" || status === "paused"}
            requireAuth
            final={status === "closed"}
          />
        </>
      )}
    </div>
  );
}
