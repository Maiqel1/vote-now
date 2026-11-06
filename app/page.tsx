import { BarChart3, CheckCircle2, ChevronDown, FileLock2, KeyRound, ListChecks, Lock, Mail, ScrollText, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PromoVideo } from "@/components/landing/PromoVideo";
import { CreatePollForm } from "@/components/polls/CreatePollForm";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { buttonVariants } from "@/components/ui/button";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerate } from "@/components/ui/text-generate";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/format";
import { getPlatformConfig } from "@/lib/server/platform-config";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

const PROMO = "https://res.cloudinary.com/wf36alzb/video/upload";
const PROMO_ID = "v1791562311/vote-now/marketing/votenow-promo";

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
    description: "Every voter gets a personal one-click link and a backup code. Or skip email entirely: voters sign in with Google, with no voter limit.",
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

const FAQS = [
  {
    q: "Is VoteNow free?",
    a: "Yes, you can start free with no credit card. Instant polls are free too, and you don't need an account to make one.",
  },
  {
    q: "Is there a limit on how many voters I can have?",
    a: "Not with Google sign-in. Turn it on, share one link, and anyone whose Google email is on your voter list can vote, with no emails sent and no voter limit. Elections that email every voter have a set number of voters per election.",
  },
  {
    q: "How do voters vote?",
    a: "Each voter gets a personal one-click link by email, plus a backup code. They open it on any phone or computer, make their choices and submit. For voters without email, you can print voting slips with a code. Or skip email entirely: voters sign in with Google using the email on your voter list.",
  },
  {
    q: "Can organisers see how someone voted?",
    a: "No. Ballots are stored with no link to the voter. Organisers can see who has voted, never how they voted.",
  },
  {
    q: "How do you stop people voting twice?",
    a: "Every voting link and code works once. The server records the ballot and marks the voter as voted in a single step, so a second attempt is refused. Instant polls block repeat and automated votes automatically, and you can require Google sign-in, limited to your organization's email domain if you like.",
  },
  {
    q: "Can voters check their vote was counted?",
    a: "Yes. After voting, each voter gets a receipt code they can check on the election page. The receipt doesn't reveal how they voted.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. VoteNow is a hosted web app. Organisers and voters use it in the browser on any phone or computer, with nothing to download or set up.",
  },
];

function structuredData(): string {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "VoteNow",
      url: appUrl("/"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any web browser",
      description:
        "Secure online voting platform for organizations, student unions, schools, clubs and associations, with instant polls for quick questions.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to start, no credit card" },
      featureList: [
        "Secret ballot",
        "One vote per voter",
        "Personal one-click voting links and backup codes",
        "No voter limit with Google sign-in",
        "Voter list import from a spreadsheet",
        "Live turnout",
        "Voter receipts",
        "Instant polls with no sign-up",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
    },
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function Home() {
  const [user, config] = await Promise.all([getCurrentUser(), getPlatformConfig()]);
  const startHref = user ? "/dashboard/new" : "/signup";

  return (
    <main className="relative overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData() }} />
      <AuroraBackdrop />
      <FloatingNavbar
        left={<Logo />}
        right={
          <>
            <a href="#how" className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              How it works
            </a>
            <Link href="/blog" className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Blog
            </Link>
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
          For organizations, student unions, associations, clubs and committees. Build the ballot, invite your voters and publish results in an afternoon.
        </p>
        <div className="relative flex animate-fade-up flex-col items-center gap-3 [animation-delay:550ms] sm:flex-row">
          <Link href={startHref} className={buttonVariants({ variant: "shimmer", size: "lg" })}>
            Create an election
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/poll" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Create a quick poll
          </Link>
        </div>
        <div className="relative mt-10 flex animate-fade-up items-center gap-5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground [animation-delay:700ms]">
          <span>Secure</span>
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          <span>Transparent</span>
          <span className="inline-block h-1 w-1 rounded-full bg-brand" />
          <span>Fair</span>
        </div>
      </section>

      <section id="demo" className="relative mx-auto max-w-5xl scroll-mt-24 px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-brand-strong">See it in action</p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">From setup to results in under a minute</h2>
        </div>
        <PromoVideo src={`${PROMO}/q_auto/${PROMO_ID}.mp4`} poster={`${PROMO}/so_38.4,w_1600,q_auto,f_auto/${PROMO_ID}.jpg`} />
      </section>

      <section id="how" className="relative mx-auto max-w-5xl scroll-mt-24 px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-brand-strong">How it works</p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">Four steps, start to finish</h2>
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

      {config.pollsOpen && (
        <section id="poll" className="relative mx-auto max-w-2xl scroll-mt-24 px-6 pb-24">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-medium text-brand-strong">Need something quicker?</p>
            <h2 className="mb-3 text-3xl font-semibold text-foreground md:text-4xl">Instant polls. No sign-up.</h2>
            <p className="text-muted-foreground">Ask a question, share the link and watch the votes come in.</p>
          </div>
          <CreatePollForm />
        </section>
      )}

      <section id="faq" className="relative mx-auto max-w-3xl scroll-mt-24 px-6 pb-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium text-brand-strong">Questions</p>
          <h2 className="text-3xl font-semibold text-foreground md:text-4xl">Frequently asked questions</h2>
        </div>
        <div className="surface divide-y divide-border/60 overflow-hidden rounded-2xl">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group px-5 py-4 md:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-medium text-foreground md:text-base [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
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
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/blog" className="hover:text-foreground">
              Blog
            </Link>
            <Link href="/poll" className="hover:text-foreground">
              Free poll maker
            </Link>
            <a href={`mailto:${process.env.SUPPORT_EMAIL ?? "support@vote-now.xyz"}`} className="hover:text-foreground">
              Contact &amp; abuse reports
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
