import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PollShell } from "@/components/polls/PollShell";
import { PollVote } from "@/components/polls/PollVote";
import { pollStatus, toPublicPoll } from "@/lib/polls";
import { getPoll } from "@/lib/server/polls";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const poll = await getPoll(params.code);
  if (!poll || poll.removedAt !== null) return { title: "Poll not found", robots: { index: false, follow: false } };
  return {
    title: poll.title,
    description: "Vote in this poll on VoteNow. It takes a second.",
    robots: { index: false, follow: false },
    openGraph: { title: poll.title, description: "Vote in this poll on VoteNow. It takes a second." },
    twitter: { card: "summary_large_image", title: poll.title },
  };
}

export default async function PollPage({ params }: { params: { code: string } }) {
  const poll = await getPoll(params.code);
  if (!poll) notFound();

  if (poll.removedAt !== null) {
    return (
      <PollShell>
        <div className="surface rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-foreground">This poll was removed</h1>
          <p className="text-sm text-muted-foreground">It broke VoteNow&apos;s rules and is no longer available.</p>
        </div>
      </PollShell>
    );
  }

  return (
    <PollShell>
      <PollVote poll={toPublicPoll(poll)} status={pollStatus(poll)} />
    </PollShell>
  );
}
