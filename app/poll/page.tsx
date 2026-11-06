import { BarChart3, Link2, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/feedback/Notice";
import { CreatePollForm } from "@/components/polls/CreatePollForm";
import { PollShell } from "@/components/polls/PollShell";
import { RecentPolls } from "@/components/polls/RecentPolls";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/format";
import { getPlatformConfig } from "@/lib/server/platform-config";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Create a poll in seconds and share the link. No sign-up, live results, a time limit you choose and protection against repeat votes.";

export const metadata: Metadata = {
  title: "Free instant poll maker",
  description: DESCRIPTION,
  alternates: { canonical: "/poll" },
  openGraph: { title: "Free instant poll maker · VoteNow", description: DESCRIPTION, url: "/poll" },
};

const STEPS = [
  {
    title: "Ask your question",
    description: "Add 2 to 10 options and choose how long it runs, from 15 minutes to 7 days.",
    icon: ListChecks,
  },
  {
    title: "Share the link",
    description: "Send it on WhatsApp, Slack, email, Twitter or anywhere else. Nobody needs an account to vote.",
    icon: Link2,
  },
  {
    title: "Watch the results",
    description: "Votes come in live. Show them as they arrive, or keep them hidden until the poll ends.",
    icon: BarChart3,
  },
];

export default async function PollMakerPage() {
  const [config, user] = await Promise.all([getPlatformConfig(), getCurrentUser()]);
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VoteNow instant polls",
    url: appUrl("/poll"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any web browser",
    description: DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free, no account needed" },
  }).replace(/</g, "\\u003c");

  return (
    <PollShell width="wide" showNewPoll={false}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <div className="mb-8 text-center">
        <p className="mb-2 text-sm font-medium text-brand-strong">Instant polls</p>
        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">Free instant poll maker</h1>
        <p className="mx-auto max-w-xl text-balance text-muted-foreground">
          Ask a question, add the options and share the link. No sign-up, live results, and it closes on its own.
        </p>
      </div>

      {config.pollsOpen ? (
        <CreatePollForm />
      ) : (
        <Notice tone="warning">New polls are paused right now. Please check back soon.</Notice>
      )}

      <div className="mt-6">
        <RecentPolls />
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-center text-2xl font-semibold text-foreground">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ title, description, icon: Icon }) => (
            <div key={title} className="surface rounded-2xl p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-brand/30 bg-brand-soft text-brand-strong">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface mt-10 rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Keeping votes fair</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          VoteNow has measures in place to stop repeat voting and automated spam. For polls where the result really matters, turn on
          Google sign-in as an extra check, and limit voting to your organization&apos;s email domain if you like. Votes are secret:
          nobody, including you, can see who picked what.
        </p>
      </section>

      <section className="mt-10 text-center">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Running a formal election?</h2>
        <p className="mx-auto mb-5 max-w-lg text-sm text-muted-foreground">
          For organizations, student unions, clubs and committees with a voter list, secret ballots and vote receipts, use a VoteNow election.
        </p>
        <Link href={user ? "/dashboard/new" : "/"} className={buttonVariants({ variant: "outline", size: "lg" })}>
          {user ? "Create an election" : "See VoteNow elections"}
        </Link>
      </section>
    </PollShell>
  );
}
