"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { adminResendInvitation, adminUnblockIp, adminUnblockVoter, adminUpdateVoterEmail } from "@/lib/actions/admin/voters";
import { useAdminAction } from "./use-admin-action";

function FixEmailDialog({ electionId, voterId, email }: { electionId: string; voterId: string; email: string }) {
  const { busy, perform } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(email);

  async function save() {
    const result = await perform(() => adminUpdateVoterEmail(electionId, voterId, value), "Email corrected. Resend their invitation next.");
    if (result.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Fix email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct this voter&apos;s email</DialogTitle>
          <DialogDescription>Their old link and code stop working. Resend the invitation afterwards so they get new ones.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`fix-${voterId}`} className="text-xs">
            Email
          </Label>
          <Input id={`fix-${voterId}`} type="email" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy || !value.trim()}>
            {busy && <Spinner />}
            Save email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VoterActions({
  electionId,
  voterId,
  email,
  canResend,
  canEdit,
  hasLimits,
}: {
  electionId: string;
  voterId: string;
  email: string;
  canResend: boolean;
  canEdit: boolean;
  hasLimits: boolean;
}) {
  const { perform } = useAdminAction();
  return (
    <div className="flex flex-wrap gap-2">
      {canResend && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Resend their invitation?"
          description={`Emails ${email} a new voting link and code. Their previous link and code stop working. This ignores the per-voter email limit.`}
          confirmLabel="Resend"
          onConfirm={async () => {
            const result = await perform(() => adminResendInvitation(electionId, voterId));
            if (result.ok) toast.success(result.data.sent ? "Invitation sent" : "Skipped: the address isn't on the email allowlist");
            return result.ok;
          }}
        >
          Resend invitation
        </ConfirmButton>
      )}
      {canEdit && <FixEmailDialog electionId={electionId} voterId={voterId} email={email} />}
      {hasLimits && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Unblock this voter?"
          description="Clears their sign-in, link-resend and vote attempt limits for this election, so they can try again straight away."
          confirmLabel="Unblock"
          onConfirm={async () => (await perform(() => adminUnblockVoter(electionId, voterId), "Voter unblocked")).ok}
        >
          Unblock
        </ConfirmButton>
      )}
    </div>
  );
}

export function UnblockIpButton({ ip }: { ip: string }) {
  const { perform } = useAdminAction();
  return (
    <ConfirmButton
      size="sm"
      title={`Unblock ${ip}?`}
      description="Clears organiser sign-in, voter sign-in, link-resend and receipt-check limits for this address."
      confirmLabel="Unblock"
      onConfirm={async () => (await perform(() => adminUnblockIp(ip), "IP address unblocked")).ok}
    >
      Unblock this IP
    </ConfirmButton>
  );
}
