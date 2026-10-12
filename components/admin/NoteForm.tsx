"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { saveElectionNote } from "@/lib/actions/admin/elections";
import { saveUserNote } from "@/lib/actions/admin/users";
import { timeAgo } from "@/lib/format";
import { useAdminAction } from "./use-admin-action";

export function NoteForm({
  kind,
  id,
  initial,
  updatedAt,
  updatedBy,
}: {
  kind: "user" | "election";
  id: string;
  initial: string;
  updatedAt: number | null;
  updatedBy: string | null;
}) {
  const { busy, perform } = useAdminAction();
  const [text, setText] = useState(initial);
  const dirty = text !== initial;

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        placeholder="Only you can see this. For example: spoke to them on WhatsApp on 12 Oct, raised voter limit for their AGM."
        className="min-h-[110px]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {updatedAt ? `Last edited ${timeAgo(updatedAt)}${updatedBy ? ` by ${updatedBy}` : ""}` : "No note yet"}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !dirty}
          onClick={() => perform(() => (kind === "user" ? saveUserNote(id, text) : saveElectionNote(id, text)), "Note saved")}
        >
          {busy && <Spinner />}
          Save note
        </Button>
      </div>
    </div>
  );
}
