import Link from "next/link";
import { Empty, LoadFailed, PageHeader, Panel } from "@/components/admin/Panel";
import { UnblockIpButton, VoterActions } from "@/components/admin/VoterActions";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, timeAgo } from "@/lib/format";
import { ipRateKeys, RATE_KIND_LABELS } from "@/lib/rate-limit-keys";
import { load } from "@/lib/server/admin/load";
import { blockStats } from "@/lib/server/admin/overview";
import { findVotersByEmail } from "@/lib/server/admin/voters";
import { rateLimitStates, type RateLimitState } from "@/lib/server/rate-limit";
import type { InviteStatus } from "@/lib/types";

export const metadata = { title: "Voters" };

const INVITE_LABELS: Record<InviteStatus, string> = {
  notSent: "Not invited yet",
  sent: "Invitation sent",
  failed: "Invitation failed",
  printed: "Slip printed",
};

function minutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60000));
}

function LimitStates({ states }: { states: RateLimitState[] }) {
  const active = states.filter((s) => s.attempts > 0);
  if (active.length === 0) return <span className="text-xs text-muted-foreground">No recent failed attempts</span>;
  return (
    <ul className="space-y-1">
      {active.map((s) => (
        <li key={s.key} className="flex flex-wrap items-center gap-2 text-xs">
          {s.blocked ? <Badge variant="red">Blocked</Badge> : <Badge>Tracking</Badge>}
          <span className="text-foreground/80">{RATE_KIND_LABELS[s.kind] ?? s.kind}</span>
          <span className="text-muted-foreground">
            {s.attempts}
            {s.limit !== null ? ` of ${s.limit}` : ""} attempts{s.blocked ? ` · clears in ${minutes(s.retryAfterMs)} min` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminVotersPage({ searchParams }: { searchParams: { email?: string; ip?: string } }) {
  const email = (searchParams.email ?? "").trim().toLowerCase();
  const ip = (searchParams.ip ?? "").trim();
  const validIp = /^[0-9a-fA-F:.]{3,45}$/.test(ip);
  const [matches, ipStates, blocks] = await Promise.all([
    email ? load("voter lookup", () => findVotersByEmail(email)) : null,
    validIp ? load("ip lookup", () => rateLimitStates(ipRateKeys(ip))) : null,
    load("rate limits", blockStats),
  ]);
  const now = Date.now();

  return (
    <div className="space-y-6">
      <PageHeader title="Voters" description="Find a voter across every election, resend their link, fix their email or unblock them." />

      <Panel>
        <form action="/admin/voters" className="flex flex-col gap-2 sm:flex-row">
          <Input name="email" type="email" defaultValue={email} placeholder="Voter's email address" required className="sm:max-w-md" />
          <Button type="submit">Find voter</Button>
        </form>
      </Panel>

      {matches &&
        (!matches.ok ? (
          <LoadFailed error={matches.error} />
        ) : matches.data.length === 0 ? (
          <Panel>
            <Empty>No voter with {email} on any election. Check the spelling, or they may have been removed from the list.</Empty>
          </Panel>
        ) : (
          <div className="space-y-3">
            {matches.data.map((m) => {
              const editable = m.electionStatus !== "closed";
              return (
                <Panel
                  key={`${m.electionId}-${m.voterId}`}
                  title={m.electionTitle}
                  description={
                    <>
                      {m.orgName} ·{" "}
                      <Link href={`/admin/elections/${m.electionId}`} className="hover:underline">
                        open election
                      </Link>
                    </>
                  }
                  action={<StatusBadge status={m.electionStatus} />}
                >
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Voter</dt>
                        <dd className="break-words text-foreground">
                          {m.name || "—"}
                          <div className="text-xs text-muted-foreground">{m.email}</div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Voted</dt>
                        <dd className="text-foreground">
                          {m.hasVoted ? (
                            <Badge variant="green">Voted {m.votedAt ? timeAgo(m.votedAt, now) : ""}</Badge>
                          ) : (
                            <Badge>Not yet</Badge>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Invitation</dt>
                        <dd className="text-foreground">
                          {INVITE_LABELS[m.inviteStatus]}
                          <div className="text-xs text-muted-foreground">
                            {m.inviteCount} email{m.inviteCount === 1 ? "" : "s"} sent{m.sentAt ? ` · last ${formatDateTime(m.sentAt)}` : ""}
                          </div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Last delivery error</dt>
                        <dd className="break-words text-xs text-foreground/80">{m.lastError ?? "None"}</dd>
                      </div>
                    </dl>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1.5 text-xs text-muted-foreground">Rate limits</div>
                        <LimitStates states={m.rateLimits} />
                      </div>
                      <VoterActions
                        electionId={m.electionId}
                        voterId={m.voterId}
                        email={m.email}
                        canResend={!m.hasVoted && editable && m.electionStatus !== "draft"}
                        canEdit={!m.hasVoted && editable}
                        hasLimits={m.rateLimits.some((s) => s.attempts > 0)}
                      />
                    </div>
                  </div>
                </Panel>
              );
            })}
            <p className="text-xs text-muted-foreground">How someone voted is never shown. Ballots are stored with no link to the voter.</p>
          </div>
        ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Unblock an IP address" description="For a school or office network where many people share one address.">
          <form action="/admin/voters" className="flex flex-col gap-2 sm:flex-row">
            <Input name="ip" defaultValue={ip} placeholder="e.g. 102.89.34.10" required />
            <Button type="submit" variant="outline">
              Check
            </Button>
          </form>
          {ip && !validIp && <p className="mt-3 text-xs text-danger">That doesn&apos;t look like an IP address.</p>}
          {ipStates &&
            (ipStates.ok ? (
              <div className="mt-4 space-y-3">
                <LimitStates states={ipStates.data} />
                <UnblockIpButton ip={ip} />
              </div>
            ) : (
              <div className="mt-4">
                <LoadFailed error={ipStates.error} />
              </div>
            ))}
        </Panel>

        <Panel title="Rate limits right now" description="Attempts tracked in the last hour, by type">
          {!blocks.ok ? (
            <LoadFailed error={blocks.error} />
          ) : blocks.data.length === 0 ? (
            <Empty>Nothing is being tracked right now.</Empty>
          ) : (
            <ul className="space-y-2 text-sm">
              {blocks.data.map((b) => (
                <li key={b.kind} className="flex items-center justify-between gap-3">
                  <span className="text-foreground/80">{b.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {b.blocked > 0 && <Badge variant="red" className="mr-2">{b.blocked} blocked</Badge>}
                    {b.tracking} tracked
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Only a fingerprint of each email or IP is stored, so search for the voter or IP above to unblock them.
          </p>
        </Panel>
      </div>
    </div>
  );
}
