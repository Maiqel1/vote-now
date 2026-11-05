import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/glow-card";
import { requireUser } from "@/lib/auth/session";
import { pluralize, timeAgo } from "@/lib/format";
import { pollEndsAt, pollStatus, toPoll, type Poll } from "@/lib/polls";
import { pollsCol, pollVoteTotal } from "@/lib/server/polls";

export const metadata = { title: "My polls" };

const STATUS_LABEL = { open: "Open", closed: "Closed", removed: "Removed" } as const;

export default async function MyPollsPage() {
  const user = await requireUser("/dashboard/polls");
  const snap = await pollsCol().where("creatorUid", "==", user.uid).get();
  const polls = snap.docs
    .map((d) => toPoll(d.id, d.data()))
    .filter((p): p is Poll => p !== null)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  const totals = await Promise.all(polls.map((p) => pollVoteTotal(p.code)));
  const now = Date.now();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold md:text-4xl">Your polls</h1>
          <p className="text-sm text-muted-foreground">Instant polls you created while signed in.</p>
        </div>
        <Link href="/poll" className={buttonVariants({ size: "lg" })}>
          + New poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="surface mx-auto max-w-xl rounded-2xl p-10 text-center">
          <h2 className="mb-2 text-2xl font-semibold">No polls yet</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Ask a quick question, share the link and watch the votes come in. Polls you create while signed in show up here.
          </p>
          <Link href="/poll" className={buttonVariants({ size: "lg" })}>
            Create a poll
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll, i) => {
            const status = pollStatus(poll, now);
            return (
              <Link
                key={poll.code}
                href={status === "removed" ? `/p/${poll.code}` : `/p/${poll.code}/manage`}
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <GlowCard className="h-full" innerClassName="flex h-full flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge>{STATUS_LABEL[status]}</Badge>
                    {poll.strict && <span className="text-[11px] text-muted-foreground">Google sign-in</span>}
                  </div>
                  <h3 className="mb-5 line-clamp-2 break-words text-lg font-semibold text-foreground">{poll.title}</h3>
                  <div className="mt-auto flex items-end justify-between text-xs text-muted-foreground">
                    <span>
                      {status === "open" ? "Closes " : "Ended "}
                      {timeAgo(pollEndsAt(poll), now)}
                    </span>
                    <span className="font-medium text-foreground/80">{pluralize(totals[i], "vote")}</span>
                  </div>
                </GlowCard>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
