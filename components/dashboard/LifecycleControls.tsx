"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  closeVotingEarly,
  extendVoting,
  publishElection,
  publishResults,
  setPaused,
  startVotingNow,
  unpublishElection,
} from "@/lib/actions/elections";
import { fromLocalInput, toLocalInput } from "@/lib/client/datetime";
import type { ActionResult, EffectiveStatus, ResultsVisibility } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";

export function LifecycleControls({
  electionId,
  status,
  endsAt,
  canEdit,
  ready,
  startReady,
  visibility,
  resultsPublished,
}: {
  electionId: string;
  status: EffectiveStatus;
  endsAt: number;
  canEdit: boolean;
  ready: boolean;
  startReady: boolean;
  visibility: ResultsVisibility;
  resultsPublished: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEnd, setNewEnd] = useState(() => toLocalInput(endsAt + 60 * 60 * 1000));
  const [startOpen, setStartOpen] = useState(false);
  const [startEnd, setStartEnd] = useState("");

  function openStartDialog(open: boolean) {
    if (open) {
      const now = Date.now();
      setStartEnd(toLocalInput(endsAt > now + 5 * 60 * 1000 ? endsAt : now + 24 * 60 * 60 * 1000));
    }
    setStartOpen(open);
  }

  async function perform(action: () => Promise<ActionResult<unknown>>, success: string): Promise<boolean> {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">You have read-only access to this election.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "draft" || status === "scheduled") && (
        <Dialog open={startOpen} onOpenChange={openStartDialog}>
          <DialogTrigger asChild>
            <Button variant="accent" disabled={!startReady || busy}>
              Start voting now
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl">Start voting now</DialogTitle>
              <DialogDescription>
                Voting opens immediately{status === "draft" ? " and the election is published" : ""}. The ballot locks as soon as voting opens. This is recorded in the activity log.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="start-end">Voting closes at</Label>
              <Input id="start-end" type="datetime-local" value={startEnd} onChange={(e) => setStartEnd(e.target.value)} />
              <p className="text-xs text-muted-foreground">At least 5 minutes from now, at most 31 days. You can still close early or extend later.</p>
            </div>
            <DialogFooter>
              <Button
                disabled={busy || !startEnd}
                onClick={async () => {
                  if (await perform(() => startVotingNow(electionId, fromLocalInput(startEnd)), "Voting is open")) {
                    setStartOpen(false);
                  }
                }}
              >
                {busy && <Spinner />}
                Open voting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {status === "draft" && (
        <ConfirmButton
          variant="outline"
          title="Publish this election?"
          description="Voting opens and closes automatically at the scheduled times. Once voting opens, the ballot is locked and can't be changed."
          confirmLabel="Publish"
          disabled={!ready || busy}
          onConfirm={() => perform(() => publishElection(electionId), "Election published")}
        >
          Publish (opens on schedule)
        </ConfirmButton>
      )}

      {status === "scheduled" && (
        <ConfirmButton
          variant="outline"
          title="Unpublish this election?"
          description="It goes back to being a draft. Invitations already sent will show “not available” until you publish again."
          confirmLabel="Unpublish"
          disabled={busy}
          onConfirm={() => perform(() => unpublishElection(electionId), "Moved back to draft")}
        >
          Unpublish
        </ConfirmButton>
      )}

      {status === "open" && (
        <ConfirmButton
          variant="outline"
          title="Pause voting?"
          description="Nobody can submit a ballot until you resume. Use this if something is wrong, such as a candidate error or a suspected security issue."
          confirmLabel="Pause voting"
          disabled={busy}
          onConfirm={() => perform(() => setPaused(electionId, true), "Voting paused")}
        >
          Pause voting
        </ConfirmButton>
      )}

      {status === "paused" && (
        <Button disabled={busy} onClick={() => perform(() => setPaused(electionId, false), "Voting resumed")}>
          {busy && <Spinner />}
          Resume voting
        </Button>
      )}

      {(status === "open" || status === "paused") && (
        <>
          <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={busy}>
                Extend voting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-xl">Extend voting</DialogTitle>
                <DialogDescription>Choose a new closing time. This is recorded in the activity log.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="new-end">New closing time</Label>
                <Input id="new-end" type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (await perform(() => extendVoting(electionId, fromLocalInput(newEnd)), "Voting extended")) {
                      setExtendOpen(false);
                    }
                  }}
                >
                  {busy && <Spinner />}
                  Extend
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ConfirmButton
            variant="destructive"
            title="Close voting now?"
            description="Voting ends immediately for everyone. This can't be undone."
            confirmLabel="Close voting"
            destructive
            disabled={busy}
            onConfirm={() => perform(() => closeVotingEarly(electionId), "Voting closed")}
          >
            Close voting early
          </ConfirmButton>
        </>
      )}

      {status === "closed" && visibility === "manual" && !resultsPublished && (
        <ConfirmButton
          title="Publish results?"
          description="The results become visible to everyone on the public results page. This can't be undone."
          confirmLabel="Publish results"
          disabled={busy}
          onConfirm={() => perform(() => publishResults(electionId), "Results published")}
        >
          Publish results
        </ConfirmButton>
      )}

      {status === "closed" && (
        <Link href={`/dashboard/e/${electionId}/results`} className={buttonVariants({ variant: "outline" })}>
          View results
        </Link>
      )}
    </div>
  );
}
