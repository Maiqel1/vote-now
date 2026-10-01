"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateVoter } from "@/lib/actions/voters";
import type { VoterRow } from "@/lib/types";

export function EditVoterDialog({
  electionId,
  voter,
  onClose,
}: {
  electionId: string;
  voter: VoterRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (voter) {
      setEmail(voter.email);
      setName(voter.name);
    }
  }, [voter]);

  async function save() {
    if (!voter) return;
    setBusy(true);
    const result = await updateVoter(electionId, voter.id, { email, name });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Voter updated");
    router.refresh();
    onClose();
  }

  const emailChanged = voter && email.trim().toLowerCase() !== voter.email.toLowerCase();

  return (
    <Dialog open={voter !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl">Edit voter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {emailChanged && voter?.inviteStatus !== "notSent" && (
            <Notice tone="warning">Changing the email cancels their current voting link. Send them a new invitation afterwards.</Notice>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Spinner />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
