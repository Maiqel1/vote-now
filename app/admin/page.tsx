import Link from "next/link";
import { BarChart } from "@/components/admin/BarChart";
import { Empty, LoadFailed, PageHeader, Panel, StatTile } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { STATUS_LABELS } from "@/lib/election-status";
import { compactNumber, timeAgo } from "@/lib/format";
import { recentInviteFailures } from "@/lib/server/admin/email";
import { load } from "@/lib/server/admin/load";
import { blockStats, electionStats, emailStats, limitPressure, userStats, votingStats } from "@/lib/server/admin/overview";
import type { EffectiveStatus } from "@/lib/types";

export const metadata = { title: "Overview" };

const STATUS_ORDER: EffectiveStatus[] = ["open", "paused", "scheduled", "draft", "closed"];

export default async function AdminOverviewPage() {
  const [users, elections, voting, email, blocks, pressure, failures] = await Promise.all([
    load("user stats", userStats),
    load("election stats", electionStats),
    load("voting stats", votingStats),
    load("email stats", emailStats),
    load("rate limits", blockStats),
    load("limit pressure", limitPressure),
    load("invite failures", () => recentInviteFailures(8)),
  ]);
  const now = Date.now();
  const blockedNow = blocks.ok ? blocks.data.reduce((sum, b) => sum + b.blocked, 0) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Everything happening on VoteNow right now." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Users"
          href="/admin/users"
          value={users.ok ? users.data.total.toLocaleString() : "—"}
          hint={users.ok ? `+${users.data.new24h} today · +${users.data.new7d} this week` : undefined}
        />
        <StatTile
          label="Active users"
          value={users.ok ? users.data.active7d.toLocaleString() : "—"}
          hint={users.ok ? `last 7 days · ${users.data.active30d.toLocaleString()} in 30 days` : undefined}
        />
        <StatTile
          label="Elections"
          href="/admin/elections"
          value={elections.ok ? elections.data.total.toLocaleString() : "—"}
          hint={elections.ok ? `${elections.data.byStatus.open} live · +${elections.data.createdLast30d} in 30 days` : undefined}
        />
        <StatTile
          label="Votes cast"
          value={voting.ok ? compactNumber(voting.data.votes) : "—"}
          hint={voting.ok ? `+${voting.data.votes24h.toLocaleString()} in 24h · ${compactNumber(voting.data.voters)} voters` : undefined}
        />
        <StatTile
          label="Emails today"
          href="/admin/email"
          value={email.ok ? `${email.data.today.toLocaleString()} / ${email.data.cap.toLocaleString()}` : "—"}
          hint={email.ok ? `${Math.max(0, email.data.cap - email.data.today).toLocaleString()} left before the daily cap` : undefined}
          tone={email.ok && email.data.today >= email.data.cap * 0.8 ? "warning" : "default"}
        />
        <StatTile
          label="Average turnout"
          value={voting.ok && voting.data.averageTurnoutClosed !== null ? `${voting.data.averageTurnoutClosed}%` : "—"}
          hint="closed elections"
        />
        <StatTile
          label="Blocked right now"
          href="/admin/voters"
          value={blockedNow ?? "—"}
          hint="voters or IPs over a rate limit"
          tone={blockedNow ? "warning" : "default"}
        />
        <StatTile
          label="Unverified accounts"
          href="/admin/users?filter=unverified"
          value={users.ok ? users.data.unverified.toLocaleString() : "—"}
          hint={users.ok && users.data.disabled > 0 ? `${users.data.disabled} disabled` : "can't send invitations yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Sign-ups" description="New accounts per day, last 30 days">
          {users.ok ? <BarChart data={users.data.signups} unit={["sign-up", "sign-ups"]} /> : <LoadFailed error={users.error} />}
        </Panel>
        <Panel title="Votes" description="Ballots cast per day, last 14 days">
          {voting.ok ? <BarChart data={voting.data.votesByDay} unit={["vote", "votes"]} /> : <LoadFailed error={voting.error} />}
        </Panel>
        <Panel title="Emails" description="Platform emails sent per day, last 14 days">
          {email.ok ? <BarChart data={email.data.byDay} unit={["email", "emails"]} /> : <LoadFailed error={email.error} />}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="Live right now" description="Elections open or paused at this moment" flush>
          {!elections.ok ? (
            <div className="p-5">
              <LoadFailed error={elections.error} />
            </div>
          ) : elections.data.live.length === 0 ? (
            <div className="p-5">
              <Empty>No elections are open right now.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {elections.data.live.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/elections/${e.id}`} className="block px-5 py-3.5 transition-colors hover:bg-muted/50">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {e.orgName} · {e.ownerEmail}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={e.status} />
                        closes {timeAgo(e.endsAt, now)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={e.turnout} className="h-1.5 flex-1" />
                      <span className="w-28 text-right text-xs tabular-nums text-muted-foreground">
                        {e.voted.toLocaleString()} / {e.voters.toLocaleString()} · {e.turnout}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Elections by status">
          {elections.ok ? (
            <ul className="space-y-2.5">
              {STATUS_ORDER.map((status) => (
                <li key={status}>
                  <Link href={`/admin/elections?status=${status}`} className="flex items-center justify-between rounded-lg px-1 py-0.5 text-sm hover:bg-muted/50">
                    <StatusBadge status={status} />
                    <span className="tabular-nums text-foreground">{elections.data.byStatus[status].toLocaleString()}</span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                {STATUS_LABELS.open} and {STATUS_LABELS.paused.toLowerCase()} count as active.
              </li>
            </ul>
          ) : (
            <LoadFailed error={elections.error} />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Coming up in the next 24 hours" flush>
          {!elections.ok ? (
            <div className="p-5">
              <LoadFailed error={elections.error} />
            </div>
          ) : elections.data.closingSoon.length + elections.data.startingSoon.length === 0 ? (
            <div className="p-5">
              <Empty>Nothing opens or closes in the next 24 hours.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {elections.data.startingSoon.map((e) => (
                <li key={`s-${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/admin/elections/${e.id}`} className="min-w-0 truncate font-medium text-foreground hover:underline">
                    {e.title}
                  </Link>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">opens {timeAgo(e.startsAt, now)}</span>
                </li>
              ))}
              {elections.data.closingSoon.map((e) => (
                <li key={`c-${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/admin/elections/${e.id}`} className="min-w-0 truncate font-medium text-foreground hover:underline">
                    {e.title}
                  </Link>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    closes {timeAgo(e.endsAt, now)} · {e.turnout}% turnout
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent sign-ups" action={<Link href="/admin/users" className="text-xs text-brand-strong hover:underline">All users</Link>} flush>
          {!users.ok ? (
            <div className="p-5">
              <LoadFailed error={users.error} />
            </div>
          ) : users.data.recent.length === 0 ? (
            <div className="p-5">
              <Empty>No accounts yet.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {users.data.recent.map((u) => (
                <li key={u.uid}>
                  <Link href={`/admin/users/${u.uid}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{u.name || u.email}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {u.email} · {u.providers.join(", ") || "no sign-in method"}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">{timeAgo(u.createdAt, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="At their limits" description="People who may need their limits raised" flush>
          {!pressure.ok ? (
            <div className="p-5">
              <LoadFailed error={pressure.error} />
            </div>
          ) : pressure.data.owners.length + pressure.data.fullElections.length === 0 ? (
            <div className="p-5">
              <Empty>Nobody is at a plan limit.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {pressure.data.owners.map((o) => (
                <li key={o.uid}>
                  <Link href={`/admin/users/${o.uid}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                    <span className="min-w-0 truncate text-foreground">{o.email || o.uid}</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {o.active} of {o.limit} active elections
                    </span>
                  </Link>
                </li>
              ))}
              {pressure.data.fullElections.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/elections/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/50">
                    <span className="min-w-0 truncate text-foreground">{e.title}</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {e.voters.toLocaleString()} of {e.limit.toLocaleString()} voters
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent invitation failures" action={<Link href="/admin/email" className="text-xs text-brand-strong hover:underline">Email</Link>} flush>
          {!failures.ok ? (
            <div className="p-5">
              <LoadFailed error={failures.error} />
            </div>
          ) : failures.data.length === 0 ? (
            <div className="p-5">
              <Empty>No failed invitations.</Empty>
            </div>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {failures.data.map((f) => (
                <li key={`${f.electionId}-${f.voterId}`} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/admin/voters?email=${encodeURIComponent(f.email)}`} className="min-w-0 truncate font-medium text-foreground hover:underline">
                      {f.email}
                    </Link>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">{timeAgo(f.sentAt, now)}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {f.electionTitle} · {f.error ?? "Unknown error"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
