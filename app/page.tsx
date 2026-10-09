import { BarChart3, CheckCircle2, FileLock2, KeyRound, ListChecks, Lock, Mail, ScrollText, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { buttonVariants } from "@/components/ui/button";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerate } from "@/components/ui/text-generate";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Build your ballot",
    description: "Positions and candidates with photos and manifestos. Single choice, pick-several, or Yes/No for uncontested seats.",
    icon: <ListChecks className="h-5 w-5" />,
    className: "md:col-span-2",
  },
  {
    title: "Upload your voters",
    description: "Paste emails or import a spreadsheet. Duplicates and typos are flagged before anything is sent.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Send secure ballots",
    description: "Every voter gets a personal one-click link and a backup code. Print slips for anyone without email.",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    title: "Watch turnout, publish results",
    description: "Live turnout on your dashboard. Results go public when you decide: live, at close, or after review.",
    icon: <BarChart3 className="h-5 w-5" />,
    className: "md:col-span-2",
  },
];

const PROMISES = [
  { title: "Secret ballot", description: "Ballots are stored with no link to the voter. Organizers see who voted, never how.", icon: <Lock className="h-5 w-5" /> },
  { title: "One person, one vote", description: "Each credential works once, enforced on the server in a single atomic step.", icon: <KeyRound className="h-5 w-5" /> },
  { title: "Locked once open", description: "Positions and candidates can't change after voting starts.", icon: <FileLock2 className="h-5 w-5" /> },
  { title: "Every action logged", description: "A permanent activity log records who opened, paused, extended or closed voting.", icon: <ScrollText className="h-5 w-5" /> },
  { title: "Voter receipts", description: "Voters get a receipt code to confirm their ballot was counted, without revealing their choice.", icon: <CheckCircle2 className="h-5 w-5" /> },
  { title: "Your data, your call", description: "Delete all voter details after the election and keep only the aggregate results.", icon: <Trash2 className="h-5 w-5" /> },
];

export default async function Home() {
  const user = await getCurrentUser();
  const startHref = user ? "/dashboard/new" : "/signup";

  return (
    <main className="relative overflow-hidden">
      <AuroraBackdrop />
      <FloatingNavbar
        left={<Logo />}
        right={
          <>
            <a href="#how" className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              How it works
            </a>
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}>
                  Log in
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                  Get started
                </Link>
              </>
            )}
          </>
        }
      />

      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-32 text-center md:pb-24 md:pt-40">
        <Spotlight className="-left-10 -top-40 md:-left-32 md:-top-20" />
        <div className="relative mb-8 inline-flex animate-fade-up items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand" />
          Start free · No credit card
        </div>
        <h1 className="relative mb-6 text-balance text-[clamp(2.6rem,7vw,5rem)] font-bold leading-[1.02] tracking-tighter text-foreground">
          <TextGenerate text="Run an election people actually trust." highlight={["trust"]} />
        </h1>
        <p className="relative mx-auto mb-10 max-w-xl animate-fade-up text-balance text-lg leading-relaxed text-muted-foreground [animation-delay:400ms]">
          For student unions, associations, clubs and committees. Build the ballot, invite your voters and publish results in an afternoon.
        </p>
        <div className="relative flex animate-fade-up flex-col items-center gap-3 [animation-delay:550ms] sm:flex-row">
          <Link href={startHref} className={buttonVariants({ variant: "shimmer", size: "lg" })}>
            Create an election
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <a href="#how" className={buttonVariants({ variant: "outline", size: "lg" })}>
            See how it works
          </a>
        </div>
        <div className="relative mt-10 flex animate-fade-up items-center gap-5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground [animation-delay:700ms]">
          <span>Secure</span>
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          <span>Transparent</span>
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          <span>Fair</span>
        </div>
      </section>

      <section id="how" className="relative mx-auto max-w-5xl scroll-mt-24 px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-brand-strong">How it works</p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">From setup to results in four steps</h2>
        </div>
        <BentoGrid>
          {STEPS.map((step) => (
            <BentoItem key={step.title} {...step} />
          ))}
        </BentoGrid>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-brand-strong">Built for elections that matter</p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">The safeguards are on by default</h2>
        </div>
        <BentoGrid className="md:grid-cols-3">
          {PROMISES.map((promise) => (
            <BentoItem key={promise.title} {...promise} />
          ))}
        </BentoGrid>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 pb-28 text-center">
        <h2 className="mb-4 text-3xl font-semibold text-foreground md:text-4xl">Your next election starts here.</h2>
        <p className="mb-8 text-muted-foreground">
          Start free. No credit card. Email invitations, reminders and live results included.
        </p>
        <Link href={startHref} className={buttonVariants({ variant: "shimmer", size: "lg" })}>
          Create your election
        </Link>
      </section>

      <footer className="relative border-t border-border/70 bg-background/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
          <Logo />
          <a href={`mailto:${process.env.SUPPORT_EMAIL ?? "support@vote-now.xyz"}`} className="hover:text-foreground">
            Contact &amp; abuse reports
          </a>
        </div>
      </footer>
    </main>
  );
}
