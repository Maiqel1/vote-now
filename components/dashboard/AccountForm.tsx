"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { updateDisplayName } from "@/lib/actions/team";

export function AccountForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const result = await updateDisplayName(value);
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Name updated");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="display-name">Display name</Label>
      <div className="flex gap-2">
        <Input id="display-name" maxLength={80} value={value} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={save} disabled={busy || value.trim() === name}>
          {busy && <Spinner />}
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Shown in the activity log and on team invitations.</p>
    </div>
  );
}
