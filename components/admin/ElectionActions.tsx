"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  adminAddMember,
  adminCloseVoting,
  adminDeleteElection,
  adminExtendVoting,
  adminPublishResults,
  adminRemoveMember,
  adminSetPaused,
  adminTransferOwnership,
} from "@/lib/actions/admin/elections";
import { fromLocalInput, toLocalInput } from "@/lib/client/datetime";
import type { EffectiveStatus } from "@/lib/types";
import { useAdminAction } from "./use-admin-action";

function ExtendDialog({ id, endsAt }: { id: string; endsAt: number }) {
  const { busy, perform } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(endsAt + 60 * 60 * 1000));

  async function save() {
    const result = await perform(() => adminExtendVoting(id, fromLocalInput(value)), "Voting extended");
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Extend voting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend voting</DialogTitle>
          <DialogDescription>Pick the new closing time, in your browser&apos;s time zone. Voting can stay open for up to 31 days in total.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="extend-to" className="text-xs">
            New closing time
          </Label>
          <Input id="extend-to" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !value}>
            {busy && <Spinner />}
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypedConfirmDialog({
  trigger,
  title,
  description,
  confirmText,
  confirmLabel,
  destructive,
  extra,
  onConfirm,
}: {
  trigger: string;
  title: string;
  description: React.ReactNode;
  confirmText: string;
  confirmLabel: string;
  destructive?: boolean;
  extra?: (busy: boolean) => React.ReactNode;
  onConfirm: (typed: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");

  async function confirm() {
    setBusy(true);
    const done = await onConfirm(typed);
    setBusy(false);
    if (done) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <DialogTrigger asChild>
        <Button size="sm" variant={destructive ? "destructive" : "outline"}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {extra?.(busy)}
        <div className="space-y-1.5">
          <Label htmlFor={`confirm-${trigger}`} className="text-xs">
            Type <span className="font-medium text-foreground">{confirmText}</span> to confirm
          </Label>
          <Input id={`confirm-${trigger}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button variant={destructive ? "destructive" : "default"} onClick={confirm} disabled={busy || typed.trim() !== confirmText}>
            {busy && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ElectionActions({
  id,
  title,
  status,
  endsAt,
  canPublishResults,
}: {
  id: string;
  title: string;
  status: EffectiveStatus;
  endsAt: number;
  canPublishResults: boolean;
}) {
  const router = useRouter();
  const { perform } = useAdminAction();
  const [newOwner, setNewOwner] = useState("");
  const live = status === "open" || status === "paused";

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Pause voting?"
          description="Voters can't vote until it's resumed. The organisers see this in their activity log as VoteNow support."
          confirmLabel="Pause voting"
          onConfirm={async () => (await perform(() => adminSetPaused(id, true), "Voting paused")).ok}
        >
          Pause voting
        </ConfirmButton>
      )}
      {status === "paused" && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Resume voting?"
          description="Voters can vote again straight away."
          confirmLabel="Resume voting"
          onConfirm={async () => (await perform(() => adminSetPaused(id, false), "Voting resumed")).ok}
        >
          Resume voting
        </ConfirmButton>
      )}
      {live && <ExtendDialog id={id} endsAt={endsAt} />}
      {live && (
        <ConfirmButton
          size="sm"
          variant="outline"
          destructive
          title="Close voting now?"
          description="Voting ends immediately and the ballot locks. A closed election can't be reopened."
          confirmLabel="Close voting"
          onConfirm={async () => (await perform(() => adminCloseVoting(id), "Voting closed")).ok}
        >
          Close voting now
        </ConfirmButton>
      )}
      {canPublishResults && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Publish the results?"
          description="The results page becomes public for everyone with the link."
          confirmLabel="Publish results"
          onConfirm={async () => (await perform(() => adminPublishResults(id), "Results published")).ok}
        >
          Publish results
        </ConfirmButton>
      )}
      <TypedConfirmDialog
        trigger="Transfer ownership"
        title="Transfer ownership"
        description="The new owner must already have a VoteNow account. The current owner stays on the team as a co-admin."
        confirmText={title}
        confirmLabel="Transfer"
        extra={() => (
          <div className="space-y-1.5">
            <Label htmlFor="new-owner" className="text-xs">
              New owner&apos;s email
            </Label>
            <Input id="new-owner" type="email" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} autoComplete="off" />
          </div>
        )}
        onConfirm={async (typed) => (await perform(() => adminTransferOwnership(id, newOwner, typed), "Ownership transferred")).ok}
      />
      <TypedConfirmDialog
        trigger="Delete election"
        title="Delete this election?"
        description="Deletes the ballot, voters, votes, results, activity log and images, and frees the URL. This can't be undone."
        confirmText={title}
        confirmLabel="Delete election"
        destructive
        onConfirm={async (typed) => {
          const result = await perform(() => adminDeleteElection(id, typed), "Election deleted");
          if (result.ok) router.replace("/admin/elections");
          return result.ok;
        }}
      />
    </div>
  );
}

export function RemoveMemberButton({ electionId, uid, email }: { electionId: string; uid: string; email: string }) {
  const { perform } = useAdminAction();
  return (
    <ConfirmButton
      size="sm"
      variant="ghost"
      title="Remove from the team?"
      description={`${email || "This person"} loses access to the election straight away.`}
      confirmLabel="Remove"
      destructive
      onConfirm={async () => (await perform(() => adminRemoveMember(electionId, uid), "Removed from the team")).ok}
    >
      Remove
    </ConfirmButton>
  );
}

export function AddMemberForm({ electionId }: { electionId: string }) {
  const { busy, perform } = useAdminAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "observer">("admin");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const result = await perform(() => adminAddMember(electionId, email, role), "Added to the team");
    if (result.ok) setEmail("");
  }

  return (
    <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
      <Input type="email" placeholder="Their VoteNow account email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <NativeSelect value={role} onChange={(e) => setRole(e.target.value as "admin" | "observer")} className="sm:w-40">
        <option value="admin">Co-admin</option>
        <option value="observer">Observer</option>
      </NativeSelect>
      <Button type="submit" variant="outline" disabled={busy || !email}>
        {busy && <Spinner />}
        Add
      </Button>
    </form>
  );
}
