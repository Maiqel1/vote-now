"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { acceptTeamInvite } from "@/lib/actions/team";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const result = await acceptTeamInvite(token);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.replace(`/dashboard/e/${result.data.electionId}`);
  }

  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      <Button className="h-11 w-full" onClick={accept} disabled={busy}>
        {busy && <Spinner />}
        Accept invitation
      </Button>
    </div>
  );
}
