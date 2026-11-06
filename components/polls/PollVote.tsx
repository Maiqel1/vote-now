"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TurnstileField, turnstileConfigured } from "@/components/auth/TurnstileField";
import { OptionRow } from "@/components/election/BallotView";
import { Notice } from "@/components/feedback/Notice";
import { Countdown } from "@/components/public/Countdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { reportPoll } from "@/lib/actions/polls";
import { browserFingerprint } from "@/lib/client/fingerprint";
import { myChoices, rememberChoices, storeDeviceId, storedDeviceId } from "@/lib/client/poll-storage";
import { usePollResults } from "@/lib/client/use-poll-results";
import { formatDomains, pollEndsAt, type PollChoices, type PollQuestion, type PollStatus, type PublicPoll } from "@/lib/polls";
import { GoogleVoteButton } from "./GoogleVoteButton";
import { PollResultsView } from "./PollResults";

type Phase = "checking" | "voting" | "voted" | "closed";

function QuestionOptions({
  question,
  value,
  onToggle,
  disabled,
}: {
  question: PollQuestion;
  value: string[];
  onToggle: (optionId: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2" role={question.multi ? "group" : "radiogroup"} aria-label={question.text}>
      {question.options.map((option) => (
        <OptionRow key={option.id} selected={value.includes(option.id)} onSelect={() => onToggle(option.id)} square={question.multi} disabled={disabled}>
          <span className="min-w-0 break-words text-sm font-medium text-foreground/90">{option.label}</span>
        </OptionRow>
      ))}
    </div>
  );
}

export function PollVote({ poll, status }: { poll: PublicPoll; status: PollStatus }) {
  const several = poll.questions.length > 1;
  const [phase, setPhase] = useState<Phase>(status === "open" ? "checking" : "closed");
  const [selected, setSelected] = useState<PollChoices>({});
  const [mine, setMine] = useState<PollChoices>({});
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance | undefined>(undefined);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<{ googleToken?: string } | null>(null);
  const [peek, setPeek] = useState(false);
  const [reported, setReported] = useState(false);

  const showResults = phase === "voted" || phase === "closed" || peek;
  const { results, removed, refresh } = usePollResults(poll.code, null, showResults && phase !== "closed");

  useEffect(() => {
    if (status !== "open") setPhase("closed");
  }, [status]);

  useEffect(() => {
    setMine(myChoices(poll.code));
    if (status !== "open") return;
    let cancelled = false;
    (async () => {
      const fp = await browserFingerprint().catch(() => null);
      if (cancelled) return;
      setFingerprint(fp);
      const params = new URLSearchParams();
      const stored = storedDeviceId();
      if (stored) params.set("d", stored);
      if (fp) params.set("f", fp);
      try {
        const res = await fetch(`/api/p/${poll.code}/status?${params}`, { cache: "no-store" });
        const data = (await res.json()) as { deviceId?: string; voted?: boolean };
        if (cancelled) return;
        if (data.deviceId) {
          storeDeviceId(data.deviceId);
          setDeviceId(data.deviceId);
        }
        setPhase(data.voted ? "voted" : "voting");
      } catch {
        if (!cancelled) setPhase("voting");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poll.code, status]);

  function toggle(question: PollQuestion, optionId: string) {
    setError("");
    setSelected((current) => {
      const value = current[question.id] ?? [];
      const next = !question.multi ? [optionId] : value.includes(optionId) ? value.filter((v) => v !== optionId) : [...value, optionId];
      return { ...current, [question.id]: next };
    });
  }

  const answers = Object.fromEntries(Object.entries(selected).filter(([, value]) => value.length > 0));
  const missingRequired = poll.questions.filter((q) => q.required && !answers[q.id]).length;
  const answeredEnough = missingRequired === 0 && Object.keys(answers).length > 0;

  const submit = useCallback(
    async (googleToken?: string) => {
      if (!answeredEnough) {
        setError(several ? "Answer the required questions first." : "Pick an option first.");
        return;
      }
      setError("");
      if (turnstileConfigured && !turnstileToken) {
        setWaiting({ googleToken });
        return;
      }
      setBusy(true);
      const res = await fetch(`/api/p/${poll.code}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices: answers, deviceId, fingerprint, turnstileToken, googleToken }),
      });
      const data = (await res.json().catch(() => ({ error: "Something went wrong. Please try again." }))) as {
        ok?: boolean;
        deviceId?: string;
        error?: string;
        alreadyVoted?: boolean;
        closed?: boolean;
      };
      setBusy(false);
      turnstile.current?.reset();
      setTurnstileToken(null);
      if (res.ok) {
        if (data.deviceId) storeDeviceId(data.deviceId);
        rememberChoices(poll.code, answers);
        setMine(answers);
        setPhase("voted");
        refresh(true);
        return;
      }
      if (data.alreadyVoted) {
        setInfo(data.error ?? "You've already voted in this poll.");
        setPhase("voted");
        refresh(true);
        return;
      }
      if (data.closed) {
        setPhase("closed");
        refresh(true);
        return;
      }
      setError(data.error ?? "We couldn't record your vote. Please try again.");
    },
    [answeredEnough, several, poll.code, answers, deviceId, fingerprint, turnstileToken, refresh],
  );

  useEffect(() => {
    if (!waiting || !turnstileToken) return;
    const queued = waiting;
    setWaiting(null);
    submit(queued.googleToken);
  }, [waiting, turnstileToken, submit]);

  async function report() {
    const result = await reportPoll(poll.code);
    setReported(true);
    if (result.ok) toast.success("Thanks. We'll take a look at this poll.");
    else toast.error(result.error);
  }

  if (removed) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">This poll was removed</h1>
        <p className="text-sm text-muted-foreground">It broke VoteNow&apos;s rules and is no longer available.</p>
      </div>
    );
  }

  const open = phase !== "closed";
  const first = poll.questions[0];
  const subtitle =
    phase === "closed"
      ? "Final results"
      : several
        ? `${poll.questions.length} questions`
        : first.multi
          ? "Pick one or more"
          : "Pick one";

  const controls = (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {poll.strict ? (
        answeredEnough ? (
          <div className="space-y-2 pt-1">
            <p className="text-center text-xs text-muted-foreground">
              {poll.allowedDomains.length > 0
                ? `Sign in with your ${formatDomains(poll.allowedDomains)} Google account to cast your vote.`
                : "Sign in with Google to cast your vote."}{" "}
              Your email isn&apos;t stored or shown to anyone.
            </p>
            {busy || waiting ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Spinner />
                {waiting ? "Checking…" : "Recording your vote…"}
              </div>
            ) : (
              <GoogleVoteButton onCredential={(token) => submit(token)} />
            )}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {several
              ? "Answer the required questions, then sign in with Google to vote."
              : "Pick an option, then sign in with Google to vote."}
          </p>
        )
      ) : (
        <>
          <Button className="h-12 w-full rounded-full" onClick={() => submit()} disabled={busy || waiting !== null || !answeredEnough}>
            {(busy || waiting) && <Spinner />}
            {waiting ? "Checking…" : several ? "Submit answers" : "Vote"}
          </Button>
          {several && missingRequired > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {missingRequired} required question{missingRequired === 1 ? "" : "s"} left
            </p>
          )}
        </>
      )}
      {poll.resultsVisibility === "live" && !peek && (
        <button type="button" onClick={() => setPeek(true)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          See results without voting
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-brand-strong">
          {open && <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand" />}
          {open ? "Poll open" : "Poll closed"}
        </div>
        <h1 className="mb-3 text-balance break-words text-3xl font-bold text-foreground md:text-4xl">{poll.title}</h1>
        <p className="text-sm text-muted-foreground">
          {subtitle}
          {open && poll.strict && (poll.allowedDomains.length > 0 ? ` · ${formatDomains(poll.allowedDomains)} Google accounts only` : " · Google sign-in required")}
        </p>
      </div>

      {open && <Countdown target={pollEndsAt(poll)} label="Closes in" />}

      {phase === "checking" && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {phase === "voting" &&
        (several ? (
          <div className="space-y-4">
            {poll.questions.map((question, i) => (
              <div key={question.id} className="surface space-y-3 rounded-2xl p-4 md:p-5">
                <div className="px-1">
                  <h2 className="break-words text-base font-semibold text-foreground">
                    <span className="text-muted-foreground">{i + 1}.</span> {question.text}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {question.multi ? "Pick one or more" : "Pick one"}
                    {question.required ? "" : " · optional"}
                  </p>
                </div>
                <QuestionOptions
                  question={question}
                  value={selected[question.id] ?? []}
                  onToggle={(optionId) => toggle(question, optionId)}
                  disabled={busy}
                />
              </div>
            ))}
            <div className="surface space-y-4 rounded-2xl p-4 md:p-5">{controls}</div>
          </div>
        ) : (
          <div className="surface space-y-4 rounded-2xl p-4 md:p-5">
            <QuestionOptions question={first} value={selected[first.id] ?? []} onToggle={(optionId) => toggle(first, optionId)} disabled={busy} />
            {controls}
          </div>
        ))}

      {(phase === "checking" || phase === "voting") && (
        <TurnstileField
          ref={turnstile}
          action="poll_vote"
          appearance="interaction-only"
          onToken={setTurnstileToken}
          onError={() => {
            setWaiting(null);
            setError("The security check couldn't load. Refresh the page and try again.");
          }}
        />
      )}

      {phase === "voted" && <Notice tone="success">{info || "Your vote is in. Thanks for taking part."}</Notice>}

      {showResults &&
        (results ? (
          <PollResultsView results={results} mine={mine} />
        ) : (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ))}

      <div className="surface flex flex-col items-center gap-3 rounded-2xl p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="text-sm font-semibold text-foreground">Need a poll of your own?</div>
          <p className="text-xs text-muted-foreground">Free, no sign-up, ready in seconds.</p>
        </div>
        <Link href="/poll" className={buttonVariants({ size: "sm", className: "rounded-full" })}>
          Create a poll
        </Link>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={report}
          disabled={reported}
          className="text-xs text-muted-foreground/70 hover:text-foreground disabled:opacity-60"
        >
          {reported ? "Reported" : "Report this poll"}
        </button>
      </div>
    </div>
  );
}
