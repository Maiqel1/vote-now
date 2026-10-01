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
  visibility,
  resultsPublished,
}: {
  electionId: string;
  status: EffectiveStatus;
  endsAt: number;
  canEdit: boolean;
  ready: boolean;
  visibility: ResultsVisibility;
  resultsPublished: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [newEnd, setNewEnd] = useState(() => toLocalInput(endsAt + 60 * 60 * 1000));

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
      {status === "draft" && (
        <ConfirmButton
          title="Publish this election?"
          description="Voters will be able to vote between the scheduled opening and closing times. Once voting opens, the ballot is locked and can't be changed."
          confirmLabel="Publish"
          disabled={!ready || busy}
          onConfirm={() => perform(() => publishElection(electionId), "Election published")}
        >
          Publish election
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
