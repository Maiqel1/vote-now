"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { changeMemberRole, inviteTeamMember, removeMember, revokeTeamInvite } from "@/lib/actions/team";
import type { Role } from "@/lib/types";
import { SettingsSection } from "./SettingsSection";

export interface TeamMember {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Exclude<Role, "owner">;
  expiresAt: number;
}

const ROLE_LABELS: Record<Role, string> = { owner: "Owner", admin: "Co-admin", observer: "Observer" };

export function TeamSettings({
  electionId,
  members,
  invites,
  currentUid,
  isOwner,
}: {
  electionId: string;
  members: TeamMember[];
  invites: PendingInvite[];
  currentUid: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<Role, "owner">>("admin");
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    const result = await inviteTeamMember(electionId, { email, role });
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invitation sent to ${email}`);
    setEmail("");
    router.refresh();
  }

  async function act(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return false;
    }
    toast.success(message);
    router.refresh();
  }

  return (
    <SettingsSection
      title="Team"
      description="Co-admins can do everything except delete the election or manage the team. Observers can view everything but change nothing. Useful for an electoral committee."
    >
      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
        {members.map((member) => (
          <div key={member.uid} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {member.name || member.email}
                {member.uid === currentUid && <span className="text-muted-foreground"> (you)</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{member.email}</div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && member.role !== "owner" ? (
                <div className="w-36">
                  <NativeSelect
                    value={member.role}
                    onChange={(e) => act(() => changeMemberRole(electionId, member.uid, e.target.value as Exclude<Role, "owner">), "Role updated")}
                  >
                    <option value="admin">Co-admin</option>
                    <option value="observer">Observer</option>
                  </NativeSelect>
                </div>
              ) : (
                <Badge variant={member.role === "owner" ? "amber" : "default"}>{ROLE_LABELS[member.role]}</Badge>
              )}
              {member.role !== "owner" && (isOwner || member.uid === currentUid) && (
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  title={member.uid === currentUid ? "Leave this election?" : `Remove ${member.name || member.email}?`}
                  description={member.uid === currentUid ? "You'll lose access until you're invited again." : "They lose access immediately."}
                  confirmLabel={member.uid === currentUid ? "Leave" : "Remove"}
                  destructive
                  onConfirm={async () => {
                    const result = await removeMember(electionId, member.uid);
                    if (!result.ok) {
                      toast.error(result.error);
                      return false;
                    }
                    if (member.uid === currentUid) router.push("/dashboard");
                    else router.refresh();
                  }}
                >
                  {member.uid === currentUid ? "Leave" : "Remove"}
                </ConfirmButton>
              )}
            </div>
          </div>
        ))}
        {invites.map((inv) => (
          <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground/80">{inv.email}</div>
              <div className="text-xs text-muted-foreground">
                Invited as {ROLE_LABELS[inv.role].toLowerCase()} · {inv.expiresAt < Date.now() ? "expired" : "pending"}
              </div>
            </div>
            {isOwner && (
              <Button size="sm" variant="ghost" onClick={() => act(() => revokeTeamInvite(electionId, inv.id), "Invitation revoked")}>
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <Input type="email" placeholder="colleague@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1" />
          <div className="w-36">
            <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, "owner">)}>
              <option value="admin">Co-admin</option>
              <option value="observer">Observer</option>
            </NativeSelect>
          </div>
          <Button onClick={invite} disabled={busy || !email.includes("@")}>
            {busy && <Spinner />}
            Invite
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
