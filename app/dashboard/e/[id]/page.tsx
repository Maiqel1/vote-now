import Link from "next/link";
import { LifecycleControls } from "@/components/dashboard/LifecycleControls";
import { TurnoutPanel } from "@/components/dashboard/TurnoutPanel";
import { Notice } from "@/components/feedback/Notice";
import { getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime } from "@/lib/format";
import { getBallot, getTally } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";
import { cn } from "@/lib/utils";
import { ballotReadinessIssues } from "@/lib/validation";

function ChecklistItem({ done, title, detail, href }: { done: boolean; title: string; detail: string; href?: string }) {
  const body = (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 transition-colors hover:bg-secondary/50">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
          done ? "border-success/30 bg-success-soft text-success" : "border-border text-transparent",
        )}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className={cn("block text-sm font-medium", done ? "text-foreground/60" : "text-foreground")}>{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function OverviewPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);
  const [ballot, tally] = await Promise.all([getBallot(election.id), getTally(election.id)]);
  const status = getEffectiveStatus(election);
  const ballotIssues = ballotReadinessIssues(ballot);
  const base = `/dashboard/e/${election.id}`;
  const positions = ballot.positions.length;
  const candidates = ballot.positions.reduce((n, p) => n + p.candidates.length, 0);
  const allInvited = election.counts.voters > 0 && election.counts.invited >= election.counts.voters;
  const ready = ballotIssues.length === 0 && election.counts.voters > 0 && election.endsAt > Date.now() + 5 * 60 * 1000;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Voting</h2>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(election.startsAt, election.timezone)} → {formatDateTime(election.endsAt, election.timezone)}
            </div>
          </div>
          {status === "paused" && <Notice tone="warning">Voting is paused. Voters can&apos;t submit ballots until you resume.</Notice>}
          {status === "draft" && election.endsAt <= Date.now() && (
            <Notice tone="warning">
              The scheduled closing time has passed. <Link href={`${base}/settings`} className="underline">Update the schedule</Link> before
              publishing.
            </Notice>
          )}
          <LifecycleControls
            electionId={election.id}
            status={status}
            endsAt={election.endsAt}
            canEdit={canEdit}
            ready={ready}
            visibility={election.results.visibility}
            resultsPublished={election.results.publishedAt !== null}
          />
        </section>

        <TurnoutPanel
          electionId={election.id}
          initialTally={tally}
          voters={election.counts.voters}
          invited={election.counts.invited}
          live={status === "open" || status === "paused"}
        />
      </div>

      <aside className="space-y-3">
        <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Setup checklist</h2>
        <ChecklistItem done title="Details" detail={election.orgName} href={`${base}/settings`} />
        <ChecklistItem
          done={ballotIssues.length === 0}
          title="Ballot"
          detail={ballotIssues[0] ?? `${positions} position${positions === 1 ? "" : "s"}, ${candidates} candidate${candidates === 1 ? "" : "s"}`}
          href={`${base}/ballot`}
        />
        <ChecklistItem
          done={election.counts.voters > 0}
          title="Voters"
          detail={election.counts.voters > 0 ? `${election.counts.voters} on the list` : "Add or import your voter list"}
          href={`${base}/voters`}
        />
        <ChecklistItem
          done={election.status === "published"}
          title="Publish"
          detail={election.status === "published" ? "Published" : "Publish to allow voting"}
        />
        <ChecklistItem
          done={allInvited}
          title="Invitations"
          detail={allInvited ? "Everyone has their ballot link" : `${election.counts.invited} of ${election.counts.voters} sent`}
          href={`${base}/invitations`}
        />
      </aside>
    </div>
  );
}
