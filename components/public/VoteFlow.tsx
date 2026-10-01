"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TurnstileField, turnstileConfigured } from "@/components/auth/TurnstileField";
import { BallotView, isAnswered, type DraftSelections } from "@/components/election/BallotView";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ABSTAIN } from "@/lib/validation";

type Step = "token" | "code" | "resend" | "ballot" | "review" | "done" | "voted";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function post<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: "Something went wrong. Please try again." }));
  return { ok: res.ok, status: res.status, data };
}

export function VoteFlow({
  slug,
  title,
  positions,
  shuffleCandidates,
  requireAll,
  token,
  sessionVoter,
}: {
  slug: string;
  title: string;
  positions: Position[];
  shuffleCandidates: boolean;
  requireAll: boolean;
  token: string | null;
  sessionVoter: string | null;
}) {
  const [step, setStep] = useState<Step>(sessionVoter ? "ballot" : token ? "token" : "code");
  const [voterDisplay, setVoterDisplay] = useState(sessionVoter ?? "");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [selections, setSelections] = useState<DraftSelections>({});
  const [receipt, setReceipt] = useState("");
  const [copied, setCopied] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance | undefined>(undefined);
  const topRef = useRef<HTMLDivElement>(null);

  const [ordered, setOrdered] = useState<Position[]>(positions);

  useEffect(() => {
    if (shuffleCandidates) setOrdered(positions.map((p) => ({ ...p, candidates: shuffle(p.candidates) })));
  }, [positions, shuffleCandidates]);

  const answered = ordered.filter((p) => isAnswered(p, selections)).length;
  const complete = requireAll ? answered === ordered.length : answered > 0;

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.history.replaceState(null, "", `/e/${slug}/vote`);
    }
  }, [token, slug]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    if (step !== "ballot" && step !== "review") return;
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(selections).length === 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step, selections]);

  function resetTurnstile() {
    turnstile.current?.reset();
    setTurnstileToken(null);
  }

  async function authenticate(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await post<{ voter: { display: string }; alreadyVoted?: boolean }>(`/api/e/${slug}/auth`, body);
    setBusy(false);
    if (!res.ok) {
      if (res.data.alreadyVoted) {
        setInfo(res.data.error ?? "You have already voted.");
        setStep("voted");
        return;
      }
      setError(res.data.error ?? "Couldn't verify you.");
      resetTurnstile();
      if (body.token) setStep("code");
      return;
    }
    setVoterDisplay(res.data.voter.display);
    setStep("ballot");
  }

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await post<{ message: string }>(`/api/e/${slug}/resend-link`, { email, turnstileToken });
    setBusy(false);
    resetTurnstile();
    if (!res.ok) setError(res.data.error ?? "Something went wrong.");
    else setInfo(res.data.message);
  }

  async function submit() {
    setBusy(true);
    setError("");
    const res = await post<{ receipt: string; expired?: boolean }>(`/api/e/${slug}/vote`, { selections });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "We couldn't record your vote.");
      if (res.data.expired) setStep("code");
      if (res.status === 409) setStep("voted");
      return;
    }
    setReceipt(res.data.receipt);
    setStep("done");
  }

  const header = (eyebrow: string, heading: React.ReactNode, sub?: React.ReactNode) => (
    <div className="mb-8 text-center">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-amber-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber-400" />
        {eyebrow}
      </div>
      <h1 className="mb-3 font-playfair text-3xl font-bold text-foreground md:text-4xl">{heading}</h1>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <div ref={topRef} className="scroll-mt-24">
      {step === "token" && (
        <div className="mx-auto max-w-md animate-slide-up">
          {header("Polls open", "Ready to vote?", title)}
          <div className="glass space-y-5 rounded-2xl p-6 md:p-8">
            <p className="text-sm leading-relaxed text-muted-foreground">
              You&apos;re using your personal voting link. Your ballot is secret: the organizers can see <em>that</em> you voted, never{" "}
              <em>how</em>.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <Button className="h-12 w-full rounded-full" onClick={() => authenticate({ token })} disabled={busy}>
              {busy && <Spinner />}
              Continue to ballot →
            </Button>
            <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep("code")}>
              Use email and code instead
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div className="mx-auto max-w-md animate-slide-up">
          {header("Polls open", "Verify to vote", "Enter the email you were invited with and the code from your invitation.")}
          <form
            className="glass space-y-5 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              authenticate({ email, code, turnstileToken });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="voter-email">Email address</Label>
              <Input id="voter-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voter-code">Voting code</Label>
              <Input
                id="voter-code"
                required
                autoComplete="one-time-code"
                placeholder="XXXX-XXXX"
                className="font-mono uppercase tracking-[0.3em]"
                value={code}
                maxLength={12}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <TurnstileField ref={turnstile} onToken={setTurnstileToken} />
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" className="h-12 w-full rounded-full" disabled={busy || (turnstileConfigured && !turnstileToken)}>
              {busy && <Spinner />}
              Verify and continue →
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setError("");
                setInfo("");
                setStep("resend");
              }}
            >
              Lost your code? Email me a new link
            </button>
          </form>
        </div>
      )}

      {step === "resend" && (
        <div className="mx-auto max-w-md animate-slide-up">
          {header("Polls open", "Get a new voting link", "We'll email a fresh link and code to the address on the voter list.")}
          <form className="glass space-y-5 rounded-2xl p-6 md:p-8" onSubmit={requestLink}>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Email address</Label>
              <Input id="resend-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <TurnstileField ref={turnstile} onToken={setTurnstileToken} />
            {error && <Notice tone="error">{error}</Notice>}
            {info && <Notice tone="success">{info}</Notice>}
            <Button type="submit" className="h-12 w-full rounded-full" disabled={busy || (turnstileConfigured && !turnstileToken)}>
              {busy && <Spinner />}
              Send me a new link
            </Button>
            <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => setStep("code")}>
              ← Back
            </button>
          </form>
        </div>
      )}

      {step === "ballot" && (
        <div>
          {header(
            "Cast your vote",
            title,
            <>
              Voting as <span className="text-amber-400">{voterDisplay}</span>. Your choices are secret and can&apos;t be changed after you submit.
            </>,
          )}
          <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-border/40 px-4 py-3 md:mx-0 md:rounded-xl md:border" style={{ background: "hsl(224 45% 6% / 0.9)", backdropFilter: "blur(16px)" }}>
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {answered} of {ordered.length} answered
              </span>
              {!requireAll && <span>You can skip positions</span>}
            </div>
            <div className="flex gap-1.5">
              {ordered.map((p) => (
                <div key={p.id} className={cn("h-1 flex-1 rounded-full transition-colors", isAnswered(p, selections) ? "bg-amber-500" : "bg-secondary")} />
              ))}
            </div>
          </div>
          <BallotView positions={ordered} selections={selections} onChange={(id, value) => setSelections((s) => ({ ...s, [id]: value }))} />
          {error && <Notice tone="error" className="mt-5">{error}</Notice>}
          <div className="mt-8">
            <Button className="h-12 w-full rounded-full" disabled={!complete} onClick={() => setStep("review")}>
              Review my ballot →
            </Button>
            {!complete && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {requireAll ? "Make a choice for every position to continue." : "Make at least one choice to continue."}
              </p>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="mx-auto max-w-xl animate-slide-up">
          {header("Almost done", "Review your ballot", "Check your choices. Once submitted, your vote is final.")}
          <div className="glass divide-y divide-border/50 overflow-hidden rounded-2xl">
            {ordered.map((p) => {
              const value = selections[p.id] ?? [];
              let display: string;
              if (value.length === 0) display = "Skipped";
              else if (value[0] === ABSTAIN) display = "Abstain";
              else if (p.type === "yesno") display = `${value[0] === "yes" ? "Yes" : "No"}: ${p.candidates[0]?.name ?? ""}`;
              else display = value.map((id) => p.candidates.find((c) => c.id === id)?.name ?? "").join(", ");
              return (
                <div key={p.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{p.title}</span>
                  <span className={cn("text-right text-sm font-medium", value.length === 0 ? "text-muted-foreground" : "text-foreground")}>{display}</span>
                </div>
              );
            })}
          </div>
          {error && <Notice tone="error" className="mt-5">{error}</Notice>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" className="h-12 flex-1 rounded-full" onClick={() => setStep("ballot")} disabled={busy}>
              ← Change choices
            </Button>
            <Button className="h-12 flex-1 rounded-full" onClick={submit} disabled={busy}>
              {busy && <Spinner />}
              Submit my vote
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="mx-auto max-w-md animate-slide-up text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                <path d="M9 12L11 14L15 10M21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 className="mb-3 font-playfair text-4xl font-bold">Vote counted</h1>
          <p className="mb-8 text-muted-foreground">Thank you for voting. Your ballot has been recorded securely and anonymously.</p>
          <div className="glass mb-6 rounded-2xl p-6">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Your receipt code</div>
            <div className="mb-4 font-mono text-2xl font-bold tracking-[0.2em] text-amber-400">{receipt}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(receipt).catch(() => undefined);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy receipt"}
            </Button>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              We&apos;ve also emailed it to you. Use it on the{" "}
              <Link href={`/e/${slug}/verify`} className="text-amber-400/80 underline">
                verify page
              </Link>{" "}
              to confirm your ballot was counted. It doesn&apos;t reveal how you voted.
            </p>
          </div>
          <Link href={`/e/${slug}`} className="btn-ghost text-sm">
            ← Back to election
          </Link>
        </div>
      )}

      {step === "voted" && (
        <div className="mx-auto max-w-md animate-slide-up text-center">
          {header("Already voted", "You've already voted", info || "Each voter can vote once.")}
          <div className="flex justify-center gap-3">
            <Link href={`/e/${slug}/verify`} className="btn-ghost text-sm">
              Check your receipt
            </Link>
            <Link href={`/e/${slug}`} className="btn-ghost text-sm">
              Election page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
