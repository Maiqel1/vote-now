import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { getCurrentUser } from "@/lib/auth/session";
import { FREE_PLAN } from "@/lib/plans";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Build your ballot",
    body: "Add positions and candidates with photos and manifestos. Single choice, pick-several, or Yes/No for uncontested seats.",
  },
  {
    title: "Upload your voters",
    body: "Paste emails or import a spreadsheet. Duplicates and typos are flagged before anything is sent.",
  },
  {
    title: "Send secure ballots",
    body: "Every voter gets a personal one-click link and a backup code. Print slips for anyone without email.",
  },
  {
    title: "Watch turnout, publish results",
    body: "Live turnout on your dashboard. Results go public when you decide: live, at close, or after review.",
  },
];

const PROMISES = [
  ["Secret ballot", "Ballots are stored with no link to the voter. Organizers see who voted, never how."],
  ["One person, one vote", "Each credential works once, enforced on the server in a single atomic transaction."],
  ["Locked once open", "Positions and candidates can't change after voting starts."],
  ["Every action logged", "A permanent activity log records who opened, paused, extended or closed voting."],
  ["Voter receipts", "Voters get a receipt code to confirm their ballot was counted, without revealing their choice."],
  ["Your data, your call", "Delete all voter details after the election and keep only the aggregate results."],
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-amber-500/[0.05] blur-[100px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-blue-600/[0.04] blur-[80px]" />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80">VoteNow</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="btn-primary px-5 py-2 text-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary px-5 py-2 text-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-16 text-center md:pt-24">
        <div className="mb-8 inline-flex animate-slide-up items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-amber-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
          Free for elections up to {FREE_PLAN.votersPerElection} voters
        </div>
        <h1 className="mb-8 animate-slide-up font-playfair font-black leading-[0.95] delay-100">
          <span className="block text-[clamp(2.8rem,8vw,5.5rem)] text-foreground/90">Run an election</span>
          <span className="gradient-text block text-[clamp(2.8rem,8vw,5.5rem)]">people trust.</span>
        </h1>
        <p className="mx-auto mb-12 max-w-xl animate-slide-up text-lg leading-relaxed text-muted-foreground delay-200">
          For student unions, associations, clubs and committees. Create the ballot, invite your voters, and publish results in an afternoon.
          No code, no spreadsheets of tallies.
        </p>
        <div className="flex animate-slide-up flex-col items-center justify-center gap-4 delay-300 sm:flex-row">
          <Link href={user ? "/dashboard/new" : "/signup"} className="btn-primary text-sm tracking-wide">
            Create an election
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a href="#how" className="btn-ghost text-sm tracking-wide">
            How it works
          </a>
        </div>
        <div className="mt-16 flex animate-slide-up items-center justify-center gap-6 text-muted-foreground/40 delay-400">
          <div className="h-px w-12 bg-current" />
          <div className="flex items-center gap-6 text-[10px] font-medium uppercase tracking-[0.2em]">
            <span>Secure</span>
            <span className="inline-block h-1 w-1 rounded-full bg-current" />
            <span>Transparent</span>
            <span className="inline-block h-1 w-1 rounded-full bg-current" />
            <span>Fair</span>
          </div>
          <div className="h-px w-12 bg-current" />
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto max-w-6xl scroll-mt-10 px-6 pb-24">
        <h2 className="mb-10 text-center font-playfair text-3xl font-bold md:text-4xl">How it works</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="glass card-hover rounded-2xl p-6">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 font-playfair text-sm font-bold text-amber-400">
                {i + 1}
              </div>
              <h3 className="mb-2 font-playfair text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="glass rounded-3xl p-8 md:p-12">
          <h2 className="mb-2 font-playfair text-3xl font-bold">Built for elections that matter</h2>
          <p className="mb-10 text-muted-foreground">The safeguards are on by default. You don&apos;t need to configure anything.</p>
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {PROMISES.map(([title, body]) => (
              <div key={title}>
                <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(38 92% 56%)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {title}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="mb-4 font-playfair text-3xl font-bold md:text-4xl">Your next election starts here.</h2>
        <p className="mb-8 text-muted-foreground">
          Free plan: {FREE_PLAN.activeElections} active elections, {FREE_PLAN.votersPerElection} voters each, email invitations and reminders included.
        </p>
        <Link href={user ? "/dashboard/new" : "/signup"} className="btn-primary text-sm">
          Create your election
        </Link>
      </section>

      <footer className="relative z-10 border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            VoteNow
          </div>
          <a href={`mailto:${process.env.SUPPORT_EMAIL ?? "support@vote-now.xyz"}`} className="hover:text-foreground">
            Contact &amp; abuse reports
          </a>
        </div>
      </footer>
    </main>
  );
}
