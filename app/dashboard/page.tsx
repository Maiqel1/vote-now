import Link from "next/link";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { getEffectiveStatus } from "@/lib/election-status";
import { formatDateTime, pluralize } from "@/lib/format";
import { FREE_PLAN } from "@/lib/plans";
import { electionsCol, getTally, toElection } from "@/lib/server/elections";
import type { EffectiveStatus, Election } from "@/lib/types";

export const metadata = { title: "My elections" };

const ORDER: EffectiveStatus[] = ["open", "paused", "scheduled", "draft", "closed"];
const GROUP_TITLES: Record<EffectiveStatus, string> = {
  open: "Live now",
  paused: "Paused",
  scheduled: "Scheduled",
  draft: "Drafts",
  closed: "Closed",
};

function ElectionCard({ election, voted, role }: { election: Election; voted: number; role: string }) {
  const status = getEffectiveStatus(election);
  const turnout = election.counts.voters > 0 ? Math.round((voted / election.counts.voters) * 100) : 0;
  return (
    <Link href={`/dashboard/e/${election.id}`} className="glass card-hover group block rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <StatusBadge status={status} />
        {role !== "owner" && <Badge>{role === "admin" ? "Co-admin" : "Observer"}</Badge>}
      </div>
      <h3 className="mb-1 line-clamp-2 font-playfair text-lg font-bold text-foreground group-hover:text-amber-300">
        {election.title}
      </h3>
      <p className="mb-4 truncate text-xs text-muted-foreground">{election.orgName}</p>
      <div className="flex items-end justify-between text-xs text-muted-foreground">
        <div>
          {status === "closed" ? "Closed " : status === "open" || status === "paused" ? "Closes " : "Opens "}
          {formatDateTime(status === "draft" || status === "scheduled" ? election.startsAt : election.endsAt, election.timezone)}
        </div>
        <div className="text-right">
          <div className="font-medium text-foreground/80">{pluralize(election.counts.voters, "voter")}</div>
          {status !== "draft" && status !== "scheduled" && <div>{turnout}% turnout</div>}
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const snap = await electionsCol().where("memberIds", "array-contains", user.uid).get();
  const elections = snap.docs
    .map((d) => toElection(d.id, d.data())!)
    .sort((a, b) => b.createdAt - a.createdAt);
  const tallies = await Promise.all(elections.map((e) => getTally(e.id)));
  const now = Date.now();
  const activeOwned = elections.filter((e) => e.ownerId === user.uid && e.endsAt > now).length;
  const atLimit = activeOwned >= FREE_PLAN.activeElections;

  const groups = ORDER.map((status) => ({
    status,
    items: elections
      .map((election, i) => ({ election, voted: tallies[i].total }))
      .filter(({ election }) => getEffectiveStatus(election, now) === status),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 font-playfair text-3xl font-bold md:text-4xl">Your elections</h1>
          <p className="text-sm text-muted-foreground">
            Free plan · {activeOwned} of {FREE_PLAN.activeElections} active elections · up to {FREE_PLAN.votersPerElection} voters each
          </p>
        </div>
        {atLimit ? (
          <div className="text-right text-xs text-muted-foreground">
            <span className="btn-ghost pointer-events-none mb-1 text-sm opacity-50">+ New election</span>
            <div>Limit reached. Delete a draft or wait for one to close.</div>
          </div>
        ) : (
          <Link href="/dashboard/new" className="btn-primary text-sm">
            + New election
          </Link>
        )}
      </div>

      {elections.length === 0 ? (
        <div className="glass mx-auto max-w-xl animate-slide-up rounded-2xl p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          </div>
          <h2 className="mb-2 font-playfair text-2xl font-bold">Run your first election</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Set up positions and candidates, upload your voter list, and send everyone a secure ballot link. It takes about ten
            minutes.
          </p>
          <Link href="/dashboard/new" className="btn-primary text-sm">
            Create an election
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.status}>
              <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">{GROUP_TITLES[group.status]}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(({ election, voted }) => (
                  <ElectionCard key={election.id} election={election} voted={voted} role={election.members[user.uid]} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
