import { formatDateTime } from "./format";
import type { AuditEntry } from "./types";

export const AUDIT_LABELS: Record<string, string> = {
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
  "voters.unblocked": "cleared sign-in limits for a voter",
  "invitations.sent": "sent invitations",
  "invitations.resent": "resent an invitation",
  "invitations.self_resent": "re-sent a voting link at a voter's request",
  "invitations.message_updated": "edited the invitation message",
  "reminders.round_started": "started a reminder round",
  "reminders.sent": "sent reminders",
  "voting.paused": "paused voting",
  "voting.resumed": "resumed voting",
  "voting.closed_early": "closed voting early",
  "voting.started_manually": "started voting manually",
  "voting.extended": "extended voting",
  "results.published": "published the results",
  "team.invited": "invited a team member",
  "team.invite_revoked": "revoked a team invitation",
  "team.role_changed": "changed a team member's role",
  "team.removed": "removed a team member",
  "team.left": "left the team",
  "team.joined": "joined the team",
  "team.member_added": "added a team member",
  "team.ownership_transferred": "transferred ownership of the election",
  "plan.limits_changed": "changed this election's limits",
};

export function describeAuditMeta(entry: Pick<AuditEntry, "action" | "meta">, timezone?: string): string | null {
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
    case "team.member_added":
      return `${m.email} as ${m.role}`;
    case "team.ownership_transferred":
      return `to ${m.to}`;
    case "reminders.round_started":
      return `round ${m.round}, ${m.due} voters`;
    case "ballot.updated":
      return `${m.positions} positions, ${m.candidates} candidates`;
    default:
      return null;
  }
}

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}
