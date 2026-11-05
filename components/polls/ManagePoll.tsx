"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/feedback/Notice";
import { Countdown } from "@/components/public/Countdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deletePoll, endPoll, getManagedPoll } from "@/lib/actions/polls";
import { forgetPoll, savedManageKey } from "@/lib/client/poll-storage";
import { durationLabel, pollEndsAt, type PollResultsPayload, type PublicPoll } from "@/lib/polls";
import { PollResultsView } from "./PollResults";
import { ShareLink } from "./ShareLink";

const REFRESH_MS = 3000;

function Confirm({
  trigger,
  title,
  description,
  action,
  onConfirm,
  destructive,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ManagePoll({ code }: { code: string }) {
  const router = useRouter();
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [results, setResults] = useState<PollResultsPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manageUrl, setManageUrl] = useState("");

  useEffect(() => {
    const fromHash = window.location.hash.slice(1) || null;
    const resolved = fromHash ?? savedManageKey(code);
    setKey(resolved);
    setManageUrl(resolved ? `${window.location.origin}/p/${code}/manage#${resolved}` : "");
  }, [code]);

  const load = useCallback(async () => {
    if (key === undefined) return;
    const result = await getManagedPoll(code, key);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setPoll(result.data.poll);
    setResults(result.data.results);
  }, [code, key]);

  useEffect(() => {
    load();
  }, [load]);

  const open = results?.status === "open";

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [open, load]);

  async function copyManageLink() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      toast.success("Manage link copied. Keep it somewhere safe.");
    } catch {
      toast.error("Couldn't copy. Bookmark this page instead.");
    }
  }

  async function end() {
    setBusy(true);
    const result = await endPoll(code, key ?? null);
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Poll ended. Final results are now public.");
      load();
    }
  }

  async function remove() {
    setBusy(true);
    const result = await deletePoll(code, key ?? null);
    if (!result.ok) {
      setBusy(false);
      toast.error(result.error);
      return;
    }
    forgetPoll(code);
    toast.success("Poll deleted.");
    router.push("/poll");
  }

  if (error && !poll) {
    return (
      <div className="surface space-y-3 rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Can&apos;t open this poll</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!poll || !results) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-brand-strong">
          {open && <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand" />}
          {open ? "Your poll is live" : "Poll ended"}
        </div>
        <h1 className="mb-3 text-balance break-words text-3xl font-bold text-foreground md:text-4xl">{poll.title}</h1>
        <p className="text-sm text-muted-foreground">
          {poll.questions.length > 1 ? `${poll.questions.length} questions` : poll.questions[0]?.multi ? "Multiple answers" : "One answer"} · {poll.strict ? "Google sign-in required" : "Open to anyone with the link"} · runs{" "}
          {durationLabel(Math.round((poll.endsAt - poll.createdAt) / 60000))}
        </p>
      </div>

      <div className="surface space-y-3 rounded-2xl p-5 md:p-6">
        <div className="text-sm font-semibold text-foreground">Share your poll</div>
        <ShareLink code={code} question={poll.title} />
      </div>

      {open && <Countdown target={pollEndsAt(poll)} label="Closes in" />}

      <PollResultsView
        results={results}
        note={poll.resultsVisibility === "afterEnd" && open ? <span>Only you can see these until the poll ends.</span> : undefined}
      />

      {manageUrl && (
        <Notice tone="info">
          <div className="space-y-2">
            <p>This page is how you manage the poll. Save the link: anyone who has it can end or delete the poll.</p>
            <Button type="button" variant="outline" size="sm" onClick={copyManageLink}>
              Copy manage link
            </Button>
          </div>
        </Notice>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {open && (
          <Confirm
            trigger={
              <Button variant="outline" disabled={busy}>
                End poll now
              </Button>
            }
            title="End this poll now?"
            description="Voting stops straight away and the final results become visible to everyone. This can't be undone."
            action="End poll"
            onConfirm={end}
          />
        )}
        <Confirm
          trigger={
            <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" disabled={busy}>
              Delete poll
            </Button>
          }
          title="Delete this poll?"
          description="The poll, its votes and its results are permanently deleted, and the link stops working."
          action="Delete poll"
          onConfirm={remove}
          destructive
        />
      </div>
    </div>
  );
}
