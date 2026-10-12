import Link from "next/link";
import { auditLabel, describeAuditMeta } from "@/lib/audit-labels";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { AdminAuditEntry } from "@/lib/server/admin-audit";
import type { ErrorLogEntry } from "@/lib/server/error-log";
import { Empty } from "./Panel";

const ADMIN_LABELS: Record<string, string> = {
  "user.disabled": "disabled the account",
  "user.enabled": "enabled the account",
  "user.signed_out": "signed them out everywhere",
  "user.email_verified": "marked the email as verified",
  "user.reset_link_created": "created a password reset link",
  "user.verify_link_created": "created a verification link",
  "user.limits_changed": "changed account limits",
  "user.limits_reset": "reset account limits",
  "user.note_updated": "edited the note",
  "user.deleted": "deleted the account",
  "election.paused": "paused voting",
  "election.resumed": "resumed voting",
  "election.closed": "closed voting",
  "election.extended": "extended voting",
  "election.results_published": "published results",
  "election.ownership_transferred": "transferred ownership",
  "election.member_added": "added a team member",
  "election.member_removed": "removed a team member",
  "election.limits_changed": "changed election limits",
  "election.limits_reset": "reset election limits",
  "election.note_updated": "edited the note",
  "election.deleted": "deleted the election",
  "voter.invitation_resent": "resent a voter's invitation",
  "voter.email_corrected": "corrected a voter's email",
  "voter.unblocked": "unblocked a voter",
  "ip.unblocked": "unblocked an IP address",
  "platform.settings_updated": "changed platform settings",
  "email.test_sent": "sent a test email",
  "email.test_failed": "tried a test email (failed)",
};

function targetHref(entry: AdminAuditEntry): string | null {
  if (entry.target.type === "user" && entry.action !== "user.deleted") return `/admin/users/${entry.target.id}`;
  if (entry.target.type === "election" && entry.action !== "election.deleted") return `/admin/elections/${entry.target.id}`;
  if (entry.target.type === "voter") return `/admin/voters?email=${encodeURIComponent(entry.target.label ?? "")}`;
  return null;
}

export function AdminLogList({ entries, showTarget = true }: { entries: AdminAuditEntry[]; showTarget?: boolean }) {
  if (entries.length === 0) return <Empty>No support actions yet.</Empty>;
  const now = Date.now();
  return (
    <ul className="divide-y divide-border/50 text-sm">
      {entries.map((entry) => {
        const href = targetHref(entry);
        const label = entry.target.label || entry.target.id;
        return (
          <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <span className="text-foreground/80">{ADMIN_LABELS[entry.action] ?? entry.action}</span>
              {showTarget && (
                <>
                  {" · "}
                  {href ? (
                    <Link href={href} className="font-medium text-foreground hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{label}</span>
                  )}
                </>
              )}
              <span className="text-xs text-muted-foreground"> by {entry.actorEmail}</span>
            </div>
            <time className="text-xs text-muted-foreground" title={formatDateTime(entry.at)}>
              {timeAgo(entry.at, now)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

export function ErrorList({ entries }: { entries: ErrorLogEntry[] }) {
  if (entries.length === 0) return <Empty>No errors recorded in the last 14 days.</Empty>;
  const now = Date.now();
  return (
    <ul className="divide-y divide-border/50">
      {entries.map((entry) => (
        <li key={entry.id} className="py-3">
          <details className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="break-words text-sm font-medium text-foreground">{entry.message || entry.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {entry.source}
                  {entry.path && <> · {entry.path}</>}
                  {entry.uid && (
                    <>
                      {" · "}
                      <Link href={`/admin/users/${entry.uid}`} className="hover:underline">
                        user
                      </Link>
                    </>
                  )}
                  {entry.electionId && (
                    <>
                      {" · "}
                      <Link href={`/admin/elections/${entry.electionId}`} className="hover:underline">
                        election
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <time className="text-xs text-muted-foreground" title={formatDateTime(entry.at)}>
                {timeAgo(entry.at, now)}
              </time>
            </summary>
            {entry.stack && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {entry.stack}
              </pre>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}

export function ElectionAuditList({ entries, timezone }: { entries: { id: string; actorName: string; action: string; meta: Record<string, unknown>; at: number }[]; timezone?: string }) {
  if (entries.length === 0) return <Empty>No activity yet.</Empty>;
  return (
    <ul className="divide-y divide-border/50 text-sm">
      {entries.map((entry) => {
        const detail = describeAuditMeta(entry, timezone);
        return (
          <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
              <span className="text-foreground/75">{auditLabel(entry.action)}</span>
              {detail && <span className="text-muted-foreground"> · {detail}</span>}
            </div>
            <time className="text-xs text-muted-foreground">{formatDateTime(entry.at, timezone)}</time>
          </li>
        );
      })}
    </ul>
  );
}
