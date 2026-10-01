"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { Notice } from "@/components/feedback/Notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { resendInvitation } from "@/lib/actions/invitations";
import { generatePrintSlips, removeVoters, type PrintSlip } from "@/lib/actions/voters";
import { downloadFile, toCsv } from "@/lib/client/voter-import";
import { FREE_PLAN } from "@/lib/plans";
import type { VoterRow } from "@/lib/types";
import { AddVotersDialog } from "./AddVotersDialog";
import { EditVoterDialog } from "./EditVoterDialog";
import { PrintSlips } from "./PrintSlips";

type Filter = "all" | "notInvited" | "invited" | "failed" | "voted" | "notVoted";

const FILTERS: Record<Filter, (v: VoterRow) => boolean> = {
  all: () => true,
  notInvited: (v) => v.inviteStatus === "notSent",
  invited: (v) => v.inviteStatus === "sent" || v.inviteStatus === "printed",
  failed: (v) => v.inviteStatus === "failed",
  voted: (v) => v.hasVoted,
  notVoted: (v) => !v.hasVoted,
};

function InviteBadge({ voter }: { voter: VoterRow }) {
  switch (voter.inviteStatus) {
    case "sent":
      return <Badge variant="blue">Emailed{voter.inviteCount > 1 ? ` ×${voter.inviteCount}` : ""}</Badge>;
    case "printed":
      return <Badge variant="blue">Slip printed</Badge>;
    case "failed":
      return (
        <Badge variant="red" title={voter.lastError ?? undefined}>
          Failed
        </Badge>
      );
    default:
      return <Badge>Not invited</Badge>;
  }
}

export function VotersManager({
  electionId,
  voters,
  canEdit,
  editable,
  canSend,
  electionTitle,
  orgName,
  entryUrl,
}: {
  electionId: string;
  voters: VoterRow[];
  canEdit: boolean;
  editable: boolean;
  canSend: boolean;
  electionTitle: string;
  orgName: string;
  entryUrl: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<VoterRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [slips, setSlips] = useState<PrintSlip[] | null>(null);
  const [printing, setPrinting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voters
      .filter(FILTERS[filter])
      .filter((v) => !q || v.email.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [voters, filter, query]);

  const selectedRows = voters.filter((v) => selected.has(v.id));
  const allVisibleSelected = visible.length > 0 && visible.every((v) => selected.has(v.id));

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) visible.forEach((v) => next.delete(v.id));
      else visible.forEach((v) => next.add(v.id));
      return next;
    });
  }

  async function resend(voter: VoterRow) {
    setBusyId(voter.id);
    const result = await resendInvitation(electionId, voter.id);
    setBusyId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(`New voting link sent to ${voter.email}`);
      router.refresh();
    }
  }

  async function removeSelected(ids: string[]) {
    const result = await removeVoters(electionId, ids);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Removed ${result.data.removed} voter${result.data.removed === 1 ? "" : "s"}`);
    setSelected(new Set());
    router.refresh();
  }

  async function printSelected() {
    setPrinting(true);
    const result = await generatePrintSlips(electionId, Array.from(selected));
    setPrinting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSlips(result.data);
    router.refresh();
  }

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Invitation", "Voted", "Voted at"],
      ...voters.map((v) => [
        v.name,
        v.email,
        v.inviteStatus,
        v.hasVoted ? "yes" : "no",
        v.votedAt ? new Date(v.votedAt).toISOString() : "",
      ]),
    ];
    downloadFile(`${electionTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-voters.csv`, toCsv(rows));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
          <div className="w-44">
            <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All voters</option>
              <option value="notInvited">Not invited</option>
              <option value="invited">Invited</option>
              <option value="failed">Invite failed</option>
              <option value="voted">Voted</option>
              <option value="notVoted">Not voted</option>
            </NativeSelect>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={voters.length === 0}>
            Export CSV
          </Button>
          {canEdit && <AddVotersDialog electionId={electionId} disabled={!editable || voters.length >= FREE_PLAN.votersPerElection} />}
        </div>
      </div>

      {voters.length >= FREE_PLAN.votersPerElection && editable && (
        <Notice tone="warning">You&apos;ve reached the free plan limit of {FREE_PLAN.votersPerElection} voters for this election.</Notice>
      )}

      {canEdit && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3 text-sm">
          <span className="text-brand-strong">{selectedRows.length} selected</span>
          <Button size="sm" variant="outline" onClick={printSelected} disabled={!editable || printing}>
            {printing && <Spinner />}
            Print credential slips
          </Button>
          <ConfirmButton
            size="sm"
            variant="outline"
            title={`Remove ${selectedRows.length} voter${selectedRows.length === 1 ? "" : "s"}?`}
            description="They won't be able to vote. Voters who have already voted can't be removed and will be skipped."
            confirmLabel="Remove"
            destructive
            disabled={!editable}
            onConfirm={() => removeSelected(Array.from(selected))}
          >
            Remove
          </ConfirmButton>
          <button className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      <div className="surface overflow-hidden rounded-2xl">
        {voters.length === 0 ? (
          <div className="p-10 text-center">
            <h3 className="mb-1 text-xl font-bold">No voters yet</h3>
            <p className="text-sm text-muted-foreground">Add voters one by one, paste a list, or import a CSV from a spreadsheet.</p>
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                {canEdit && (
                  <TH className="w-10">
                    <input type="checkbox" aria-label="Select all" checked={allVisibleSelected} onChange={toggleAll} className="accent-brand" />
                  </TH>
                )}
                <TH>Voter</TH>
                <TH>Invitation</TH>
                <TH>Status</TH>
                {canEdit && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {visible.map((voter) => (
                <TR key={voter.id}>
                  {canEdit && (
                    <TD>
                      <input
                        type="checkbox"
                        aria-label={`Select ${voter.email}`}
                        checked={selected.has(voter.id)}
                        onChange={() => toggle(voter.id)}
                        className="accent-brand"
                      />
                    </TD>
                  )}
                  <TD>
                    <div className="font-medium text-foreground/90">{voter.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{voter.email}</div>
                  </TD>
                  <TD>
                    <InviteBadge voter={voter} />
                  </TD>
                  <TD>{voter.hasVoted ? <Badge variant="green">Voted</Badge> : <span className="text-xs text-muted-foreground">Not yet</span>}</TD>
                  {canEdit && (
                    <TD className="text-right">
                      {!voter.hasVoted && editable && (
                        <div className="flex justify-end gap-1">
                          {canSend && voter.inviteStatus !== "notSent" && (
                            <Button size="sm" variant="ghost" onClick={() => resend(voter)} disabled={busyId === voter.id}>
                              {busyId === voter.id && <Spinner />}
                              Resend
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setEditing(voter)}>
                            Edit
                          </Button>
                        </div>
                      )}
                    </TD>
                  )}
                </TR>
              ))}
              {visible.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No voters match.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {voters.length} of {FREE_PLAN.votersPerElection} voters. Names and emails are only visible to you and your team.
      </p>

      <EditVoterDialog electionId={electionId} voter={editing} onClose={() => setEditing(null)} />
      {slips && (
        <PrintSlips
          slips={slips}
          electionTitle={electionTitle}
          orgName={orgName}
          entryUrl={entryUrl}
          onDone={() => {
            setSlips(null);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
