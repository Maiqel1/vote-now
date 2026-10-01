"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { checkSlugAvailable, createElection } from "@/lib/actions/elections";
import { browserTimezone, fromLocalInput, roundToNextHour, toLocalInput } from "@/lib/client/datetime";
import { slugify } from "@/lib/format";
import type { ResultsVisibility } from "@/lib/types";
import { cn } from "@/lib/utils";
import { VisibilityOptions } from "./VisibilityOptions";

const STEPS = ["Basics", "Schedule", "Results"];
const DAY = 24 * 60 * 60 * 1000;

export function NewElectionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const defaults = useMemo(() => {
    const start = roundToNextHour(Date.now() + DAY);
    return { start: toLocalInput(start), end: toLocalInput(start + 8 * 60 * 60 * 1000) };
  }, []);
  const [startsAt, setStartsAt] = useState(defaults.start);
  const [endsAt, setEndsAt] = useState(defaults.end);
  const [visibility, setVisibility] = useState<ResultsVisibility>("afterClose");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const timezone = useMemo(() => browserTimezone(), []);
  const [host, setHost] = useState("vote-now.xyz");

  useEffect(() => setHost(window.location.host), []);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(title));
  }, [title, slugEdited]);

  useEffect(() => {
    if (slug.length < 3) {
      setSlugState(slug ? "invalid" : "idle");
      return;
    }
    setSlugState("checking");
    const handle = setTimeout(async () => {
      const result = await checkSlugAvailable(slug);
      if (!result.ok) setSlugState("invalid");
      else setSlugState(result.data.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(handle);
  }, [slug]);

  function validateStep(): string | null {
    if (step === 0) {
      if (title.trim().length < 3) return "Give your election a title (at least 3 characters).";
      if (orgName.trim().length < 2) return "Add the name of the organization running the election.";
      if (slugState === "taken") return "That URL is taken. Choose another.";
      if (slugState === "invalid" || slug.length < 3) return "Use 3–50 lowercase letters, numbers or hyphens for the URL.";
      if (slugState === "checking") return "Still checking the URL…";
    }
    if (step === 1) {
      const start = fromLocalInput(startsAt);
      const end = fromLocalInput(endsAt);
      if (!startsAt || !endsAt || Number.isNaN(start) || Number.isNaN(end)) return "Choose when voting opens and closes.";
      if (end <= start) return "Voting must close after it opens.";
      if (end <= Date.now()) return "The closing time must be in the future.";
      if (end - start > 31 * DAY) return "Voting can stay open for at most 31 days.";
    }
    return null;
  }

  function next() {
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  async function submit() {
    setSaving(true);
    setError("");
    const result = await createElection({
      title,
      orgName,
      description,
      slug,
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
      timezone,
      visibility,
    });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/dashboard/e/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-2">
            <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-amber-500" : "bg-secondary")} />
            <span className={cn("text-xs", i === step ? "text-amber-400" : "text-muted-foreground/60")}>
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="glass animate-slide-up-sm space-y-6 rounded-2xl p-6 md:p-8" key={step}>
        {step === 0 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Election title</Label>
              <Input
                id="title"
                placeholder="e.g. Student Union Executive Elections 2026"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <Input
                id="org"
                placeholder="e.g. SHMC Students' Association"
                maxLength={120}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground/70">Shown to voters in emails as “{orgName || "Your organization"} via VoteNow”.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                maxLength={2000}
                placeholder="What is this election for? Anything voters should know?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Public link</Label>
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-input/60 focus-within:border-amber-500/50">
                <span className="hidden whitespace-nowrap pl-4 text-sm text-muted-foreground sm:inline">{host}/e/</span>
                <input
                  id="slug"
                  className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none sm:pl-0.5"
                  value={slug}
                  maxLength={50}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
                <span className="pr-4 text-xs">
                  {slugState === "checking" && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
                  {slugState === "available" && <span className="text-emerald-400">Available</span>}
                  {slugState === "taken" && <span className="text-red-400">Taken</span>}
                </span>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts">Voting opens</Label>
                <Input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends">Voting closes</Label>
                <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <Notice tone="info">
              Times are in your timezone ({timezone}). Voting opens and closes automatically. You can pause, extend or close early
              at any time.
            </Notice>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h2 className="mb-1 font-playfair text-xl font-bold">Who sees the results, and when?</h2>
              <p className="text-sm text-muted-foreground">You can change this later, up until results are published.</p>
            </div>
            <VisibilityOptions value={visibility} onChange={setVisibility} />
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              ← Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue →</Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving && <Spinner />}
              Create election
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
