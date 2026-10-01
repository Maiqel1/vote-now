import { formatDateTime } from "@/lib/format";
import { electionDoc } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";
import type { AuditEntry } from "@/lib/types";

export const metadata = { title: "Activity" };

const LABELS: Record<string, string> = {
  "election.created": "created the election",
  "election.details_updated": "updated the details",
  "election.schedule_updated": "changed the schedule",
  "election.visibility_updated": "changed results visibility",
  "election.ballot_options_updated": "changed ballot options",
  "election.branding_updated": "updated branding",
  "election.published": "published the election",
  "election.unpublished": "moved the election back to draft",
  "ballot.updated": "saved the ballot",
  "voters.added": "added voters",
  "voters.updated": "edited a voter",
  "voters.removed": "removed voters",
  "voters.slips_printed": "printed credential slips",
  "voters.purged": "deleted all voter data",
  "invitations.sent": "sent invitations",
  "invitations.resent": "resent an invitation",
  "invitations.self_resent": "re-sent a voting link at a voter's request",
  "invitations.message_updated": "edited the invitation message",
  "reminders.round_started": "started a reminder round",
  "reminders.sent": "sent reminders",
  "voting.paused": "paused voting",
  "voting.resumed": "resumed voting",
  "voting.closed_early": "closed voting early",
  "voting.extended": "extended voting",
  "results.published": "published the results",
  "team.invited": "invited a team member",
  "team.invite_revoked": "revoked a team invitation",
  "team.role_changed": "changed a team member's role",
  "team.removed": "removed a team member",
  "team.left": "left the team",
  "team.joined": "joined the team",
};

function describeMeta(entry: AuditEntry, timezone: string): string | null {
  const m = entry.meta;
  switch (entry.action) {
    case "voters.added":
    case "voters.removed":
    case "voters.slips_printed":
    case "voters.purged":
      return `${m.count} voter${m.count === 1 ? "" : "s"}`;
    case "invitations.sent":
    case "reminders.sent":
      return `${m.sent} sent${m.failed ? `, ${m.failed} failed` : ""}${m.skipped ? `, ${m.skipped} skipped` : ""}`;
    case "voting.extended":
      return `to ${formatDateTime(Number(m.to), timezone)}`;
    case "election.visibility_updated":
      return String(m.visibility);
    case "team.invited":
      return `${m.email} as ${m.role}`;
    case "reminders.round_started":
      return `round ${m.round}, ${m.due} voters`;
    case "ballot.updated":
      return `${m.positions} positions, ${m.candidates} candidates`;
    default:
      return null;
  }
}

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const { election } = await loadElectionPage(params.id);
  const snap = await electionDoc(election.id).collection("audit").orderBy("at", "desc").limit(200).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, "id">) }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A permanent record of every administrative action. It can&apos;t be edited or deleted, which helps resolve disputes.
      </p>
      <div className="surface divide-y divide-border/50 overflow-hidden rounded-2xl">
        {entries.length === 0 && <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>}
        {entries.map((entry) => {
          const detail = describeMeta(entry, election.timezone);
          return (
            <div key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 text-sm">
              <div>
                <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                <span className="text-foreground/75">{LABELS[entry.action] ?? entry.action}</span>
                {detail && <span className="text-muted-foreground"> · {detail}</span>}
              </div>
              <time className="text-xs text-muted-foreground">{formatDateTime(entry.at, election.timezone)}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
