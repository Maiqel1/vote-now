"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  createAccountLink,
  deleteUserAccount,
  markEmailVerified,
  setUserDisabled,
  signOutUserEverywhere,
} from "@/lib/actions/admin/users";
import type { AdminUser } from "@/lib/server/admin/users";
import { useAdminAction } from "./use-admin-action";

function LinkDialog({ user, kind }: { user: AdminUser; kind: "reset" | "verify" }) {
  const { busy, perform } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function create(send: boolean) {
    const result = await perform(() => createAccountLink(user.uid, kind, send));
    if (result.ok) {
      setLink(result.data.link);
      toast.success(send ? (result.data.sent ? `Emailed to ${user.email}` : "Link created, but the email was skipped (allowlist)") : "Link created");
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  const title = kind === "reset" ? "Password reset link" : "Email verification link";
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setLink(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {kind === "reset" ? "Password reset link" : "Verification link"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {kind === "reset"
              ? "Lets them choose a new password. Send it yourself, for example on WhatsApp, or email it from VoteNow."
              : "Confirms their email address so they can send invitations."}{" "}
            Treat the link like a password: anyone who has it can use it.
          </DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-2">
            <Label className="text-xs">Link for {user.email}</Label>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => create(false)} disabled={busy}>
            {busy && <Spinner />}
            Create link
          </Button>
          <Button onClick={() => create(true)} disabled={busy}>
            Create and email it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ user }: { user: AdminUser }) {
  const router = useRouter();
  const { busy, perform } = useAdminAction();
  const [confirm, setConfirm] = useState("");

  async function remove() {
    const result = await perform(() => deleteUserAccount(user.uid, confirm), "Account deleted");
    if (result.ok) router.replace("/admin/users");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" disabled={user.owned > 0} title={user.owned > 0 ? "Transfer or delete their elections first" : undefined}>
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this account?</DialogTitle>
          <DialogDescription>
            Removes their sign-in, profile and team memberships. Elections they helped run keep their activity history. This can&apos;t
            be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-email" className="text-xs">
            Type <span className="font-mono">{user.email}</span> to confirm
          </Label>
          <Input id="confirm-email" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={remove} disabled={busy || confirm.trim().toLowerCase() !== user.email.toLowerCase()}>
            {busy && <Spinner />}
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserActions({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const { perform } = useAdminAction();
  const hasPassword = user.providers.includes("Password");

  return (
    <div className="flex flex-wrap gap-2">
      {!user.emailVerified && (
        <ConfirmButton
          size="sm"
          variant="outline"
          title="Mark this email as verified?"
          description={`Use this when ${user.email} can't receive the verification email. They'll be able to send invitations straight away.`}
          confirmLabel="Mark verified"
          onConfirm={async () => (await perform(() => markEmailVerified(user.uid), "Email marked as verified")).ok}
        >
          Mark email verified
        </ConfirmButton>
      )}
      {!user.emailVerified && <LinkDialog user={user} kind="verify" />}
      {hasPassword && <LinkDialog user={user} kind="reset" />}
      <ConfirmButton
        size="sm"
        variant="outline"
        title="Sign them out everywhere?"
        description="Ends every session on every device. They can sign straight back in."
        confirmLabel="Sign out everywhere"
        onConfirm={async () => (await perform(() => signOutUserEverywhere(user.uid), "Signed out everywhere")).ok}
      >
        Sign out everywhere
      </ConfirmButton>
      {!isSelf &&
        (user.disabled ? (
          <ConfirmButton
            size="sm"
            variant="outline"
            title="Enable this account?"
            description="They'll be able to sign in again."
            confirmLabel="Enable account"
            onConfirm={async () => (await perform(() => setUserDisabled(user.uid, false), "Account enabled")).ok}
          >
            Enable account
          </ConfirmButton>
        ) : (
          <ConfirmButton
            size="sm"
            variant="outline"
            destructive
            title="Disable this account?"
            description="They're signed out everywhere and can't sign in until you enable the account again. Their elections keep running."
            confirmLabel="Disable account"
            onConfirm={async () => (await perform(() => setUserDisabled(user.uid, true), "Account disabled")).ok}
          >
            Disable account
          </ConfirmButton>
        ))}
      {!isSelf && <DeleteDialog user={user} />}
    </div>
  );
}
