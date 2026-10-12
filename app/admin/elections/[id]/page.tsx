import Link from "next/link";
import { notFound } from "next/navigation";
import { AddMemberForm, ElectionActions, RemoveMemberButton } from "@/components/admin/ElectionActions";
import { AdminLogList, ElectionAuditList, ErrorList } from "@/components/admin/EventLists";
import { LimitsForm } from "@/components/admin/LimitsForm";
import { NoteForm } from "@/components/admin/NoteForm";
import { Empty, KeyValue, LoadFailed, Panel, StatTile } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { canPublishResultsManually } from "@/lib/election-status";
import { formatDateTime, timeAgo } from "@/lib/format";
import { LIMIT_KEYS, resolveLimits } from "@/lib/plans";
import { adminLog, recentErrors } from "@/lib/server/admin/activity";
import { getAdminElection } from "@/lib/server/admin/elections";
import { load } from "@/lib/server/admin/load";
import { getAdminNote } from "@/lib/server/admin/notes";

export const metadata = { title: "Election" };

const ROLE_LABELS = { owner: "Owner", admin: "Co-admin", observer: "Observer" } as const;
const VISIBILITY_LABELS = {
  live: "Live while voting is open",
  afterClose: "When voting closes",
  manual: "When an organiser publishes them",
  private: "Never public",
} as const;

export default async function AdminElectionPage({ params }: { params: { id: string } }) {
  const detail = await getAdminElection(params.id);
  if (!detail) notFound();
  const { election, status } = detail;
  const [note, errors, history] = await Promise.all([
    getAdminNote("election", election.id),
    load("election errors", () => recentErrors({ electionId: election.id, limit: 20 })),
    load("election history", () => adminLog({ targetId: election.id, limit: 20 })),
  ]);
  const now = Date.now();
  const tz = election.timezone;
  const owner = detail.members.find((m) => m.role === "owner");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/elections" className="text-xs text-muted-foreground hover:text-brand-strong">
          ← All elections
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {Object.keys(detail.electionOverrides).length > 0 && <Badge variant="blue">Custom limits</Badge>}
              {election.piiPurgedAt && <Badge>Voter data deleted</Badge>}
            </div>
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{election.title}</h1>
            <p className="text-sm text-muted-foreground">
              {election.orgName} · owned by{" "}
              {owner ? (
                <Link href={`/admin/users/${owner.uid}`} className="hover:underline">
                  {owner.email || owner.uid}
                </Link>
              ) : (
                "unknown"
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/e/${election.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Open support view
            </Link>
            <Link href={`/e/${election.slug}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Public page ↗
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Voters" value={election.counts.voters.toLocaleString()} hint={`${election.counts.invited.toLocaleString()} invited`} />
        <StatTile label="Voted" value={detail.voted.toLocaleString()} hint={`${detail.turnout}% turnout`} />
        <StatTile
          label={status === "closed" ? "Closed" : status === "draft" || status === "scheduled" ? "Opens" : "Closes"}
          value={timeAgo(status === "draft" || status === "scheduled" ? election.startsAt : election.endsAt, now)}
          hint={formatDateTime(status === "draft" || status === "scheduled" ? election.startsAt : election.endsAt, tz)}
        />
        <StatTile
          label="Invitation failures"
          value={detail.inviteStats.failed.toLocaleString()}
          hint={`${detail.inviteStats.notSent.toLocaleString()} not sent yet`}
          tone={detail.inviteStats.failed > 0 ? "warning" : "default"}
        />
      </div>

      {(status === "open" || status === "paused" || status === "closed") && (
        <div className="flex items-center gap-3">
          <Progress value={detail.turnout} className="h-2 flex-1" />
          <span className="text-xs tabular-nums text-muted-foreground">{detail.turnout}%</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Details">
          <KeyValue
            items={[
              ["Public URL", <Link key="url" href={`/e/${election.slug}`} className="hover:underline">/e/{election.slug}</Link>],
              ["Election ID", <span key="id" className="font-mono text-xs">{election.id}</span>],
              ["Opens", formatDateTime(election.startsAt, tz)],
              ["Closes", formatDateTime(election.endsAt, tz)],
              ["Time zone", tz],
              ["Created", `${formatDateTime(election.createdAt, tz)} (${timeAgo(election.createdAt, now)})`],
              ["Results", VISIBILITY_LABELS[election.results.visibility]],
              ["Results published", election.results.publishedAt ? formatDateTime(election.results.publishedAt, tz) : "Not yet"],
              ["Ballot locked", election.lockedAt ? formatDateTime(election.lockedAt, tz) : "No"],
              ["Reminder rounds used", `${election.reminderRound} of ${detail.limits.reminderRounds}`],
              ["Ballot options", `${election.ballotOptions.shuffle ? "Shuffled" : "Fixed order"} · ${election.ballotOptions.requireAll ? "every position required" : "positions optional"}`],
              ["Voter data", election.piiPurgedAt ? `Deleted ${formatDateTime(election.piiPurgedAt, tz)}` : "Kept"],
            ]}
          />
        </Panel>
        <Panel title="Support actions" description="The organisers see these as “VoteNow support” in their activity log.">
          <ElectionActions
            id={election.id}
            title={election.title}
            status={status}
            endsAt={election.endsAt}
            canPublishResults={canPublishResultsManually(election)}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Team" flush>
          <ul className="divide-y divide-border/50 text-sm">
            {detail.members.map((m) => (
              <li key={m.uid} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/users/${m.uid}`} className="block truncate font-medium text-foreground hover:underline">
                    {m.name || m.email || m.uid}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">
                    {m.email} · {ROLE_LABELS[m.role]}
                  </div>
                </div>
                {m.role !== "owner" && <RemoveMemberButton electionId={election.id} uid={m.uid} email={m.email} />}
              </li>
            ))}
            {detail.invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 px-5 py-3 text-muted-foreground">
                <span className="min-w-0 truncate">{invite.email}</span>
                <span className="flex-shrink-0 text-xs">
                  invited as {invite.role} · {invite.expiresAt > now ? `expires ${timeAgo(invite.expiresAt, now)}` : "expired"}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border/60 p-5">
            <AddMemberForm electionId={election.id} />
          </div>
        </Panel>

        <Panel title="Invitations" flush>
          <div className="grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-4">
            {(
              [
                ["Sent", detail.inviteStats.sent],
                ["Printed", detail.inviteStats.printed],
                ["Not sent", detail.inviteStats.notSent],
                ["Failed", detail.inviteStats.failed],
              ] as const
            ).map(([label, count]) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
          {detail.failures.length > 0 ? (
            <ul className="divide-y divide-border/50 border-t border-border/60 text-sm">
              {detail.failures.map((f) => (
                <li key={f.voterId} className="px-5 py-2.5">
                  <Link href={`/admin/voters?email=${encodeURIComponent(f.email)}`} className="font-medium text-foreground hover:underline">
                    {f.email}
                  </Link>
                  <div className="text-xs text-muted-foreground">{f.error ?? "Unknown error"}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t border-border/60 px-5 py-4">
              <Empty>No failed invitations.</Empty>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Limits" description="Defaults come from the owner's limits, or the free plan.">
          <LimitsForm
            kind="election"
            id={election.id}
            overrides={detail.electionOverrides}
            inherited={resolveLimits(detail.ownerOverrides)}
            fields={LIMIT_KEYS.filter((key) => key !== "activeElections")}
          />
        </Panel>
        <Panel title="Internal note">
          <NoteForm kind="election" id={election.id} initial={note.text} updatedAt={note.updatedAt} updatedBy={note.updatedBy} />
        </Panel>
      </div>

      <Panel title="Activity" description="The election's own log, as the organisers see it (latest 50)">
        <ElectionAuditList entries={detail.audit} timezone={tz} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent errors" description="Server errors on this election's pages, last 14 days">
          {errors.ok ? <ErrorList entries={errors.data} /> : <LoadFailed error={errors.error} />}
        </Panel>
        <Panel title="Support history">
          {history.ok ? <AdminLogList entries={history.data} showTarget={false} /> : <LoadFailed error={history.error} />}
        </Panel>
      </div>
    </div>
  );
}
