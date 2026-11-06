"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { GoogleListReminder } from "@/components/dashboard/VoterAccessOptions";
import { Notice } from "@/components/feedback/Notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { resendInvitation } from "@/lib/actions/invitations";
import { generatePrintSlips, listVoters, removeVoters, type PrintSlip } from "@/lib/actions/voters";
import { downloadFile, toCsv } from "@/lib/client/voter-import";
import type { PlanLimits } from "@/lib/plans";
import type { VoterRow } from "@/lib/types";
import { AddVotersDialog } from "./AddVotersDialog";
import { EditVoterDialog } from "./EditVoterDialog";
import { PrintSlips } from "./PrintSlips";

type Filter = "all" | "notInvited" | "invited" | "failed" | "voted" | "notVoted";

const PAGE = 100;
const EXPORT_PAGE = 1000;

const FILTERS: Record<Filter, (v: VoterRow) => boolean> = {
  all: () => true,
  notInvited: (v) => v.inviteStatus === "notSent",
  invited: (v) => v.inviteStatus === "sent" || v.inviteStatus === "printed",
  failed: (v) => v.inviteStatus === "failed",
  voted: (v) => v.hasVoted,
  notVoted: (v) => !v.hasVoted,
};

function InviteBadge({ voter, googleAccess }: { voter: VoterRow; googleAccess: boolean }) {
  if (googleAccess) {
    return voter.inviteStatus === "printed" ? <Badge variant="blue">Slip printed</Badge> : <Badge>Google sign-in</Badge>;
  }
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
  initialRows,
  initialNext,
  total,
  complete,
  canEdit,
  editable,
  canSend,
  electionTitle,
  orgName,
  entryUrl,
  limits,
  googleAccess,
  settingsHref,
  canSwitchAccess,
}: {
  electionId: string;
  limits: PlanLimits;
  initialRows: VoterRow[];
  initialNext: string | null;
  total: number;
  complete: boolean;
  canEdit: boolean;
  editable: boolean;
  canSend: boolean;
  electionTitle: string;
  orgName: string;
  entryUrl: string;
  googleAccess: boolean;
  settingsHref: string;
  canSwitchAccess: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<VoterRow[]>(initialRows);
  const [next, setNext] = useState<string | null>(initialNext);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<VoterRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [slips, setSlips] = useState<PrintSlip[] | null>(null);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const firstQuery = useRef(true);
  const wasComplete = useRef(complete);

  const fetchPage = useCallback(
    async (after: string | null) => {
      setLoading(true);
      const result = await listVoters(electionId, { filter, search: query, after, limit: PAGE });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRows((current) => (after ? [...current, ...result.data.rows] : result.data.rows));
      setNext(result.data.next);
    },
    [electionId, filter, query],
  );

  useEffect(() => {
    if (complete) {
      setRows(initialRows);
      setNext(null);
    } else if (wasComplete.current) {
      fetchPage(null);
    }
    wasComplete.current = complete;
  }, [complete, initialRows, fetchPage]);

  useEffect(() => {
    if (complete) return;
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    const handle = setTimeout(() => fetchPage(null), 300);
    return () => clearTimeout(handle);
  }, [complete, fetchPage]);

  function reload() {
    router.refresh();
    if (!complete) fetchPage(null);
  }

  const visible = useMemo(() => {
    if (!complete) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(FILTERS[filter]).filter((v) => !q || v.email.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [complete, rows, filter, query]);

  const selectedRows = rows.filter((v) => selected.has(v.id));
  const allVisibleSelected = visible.length > 0 && visible.every((v) => selected.has(v.id));
  const atLimit = total >= limits.votersPerElection;

  function toggle(id: string) {
    setSelected((s) => {
      const nextSet = new Set(s);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  function toggleAll() {
    setSelected((s) => {
      const nextSet = new Set(s);
      if (allVisibleSelected) visible.forEach((v) => nextSet.delete(v.id));
      else visible.forEach((v) => nextSet.add(v.id));
      return nextSet;
    });
  }

  async function resend(voter: VoterRow) {
    setBusyId(voter.id);
    const result = await resendInvitation(electionId, voter.id);
    setBusyId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(`New voting link sent to ${voter.email}`);
      reload();
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
    reload();
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
    reload();
  }

  async function exportCsv() {
    let all: VoterRow[] = [];
    if (complete) {
      all = rows;
    } else {
      setExporting(0);
      let after: string | null = null;
      do {
        const result = await listVoters(electionId, { filter: "all", search: "", after, limit: EXPORT_PAGE });
        if (!result.ok) {
          toast.error(result.error);
          setExporting(null);
          return;
        }
        all = all.concat(result.data.rows);
        after = result.data.next;
        setExporting(all.length);
      } while (after);
      setExporting(null);
    }
    const csvRows = [
      ["Name", "Email", googleAccess ? "Slip" : "Invitation", "Voted", "Voted at"],
      ...all.map((v) => [v.name, v.email, v.inviteStatus, v.hasVoted ? "yes" : "no", v.votedAt ? new Date(v.votedAt).toISOString() : ""]),
    ];
    downloadFile(`${electionTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-voters.csv`, toCsv(csvRows));
  }

  return (
    <div className="space-y-5">
      {googleAccess && <GoogleListReminder />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            placeholder={complete ? "Search name or email" : "Search by email"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <div className="w-44">
            <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All voters</option>
              {!googleAccess && (
                <>
                  <option value="notInvited">Not invited</option>
                  <option value="invited">Invited</option>
                  <option value="failed">Invite failed</option>
                </>
              )}
              <option value="voted">Voted</option>
              <option value="notVoted">Not voted</option>
            </NativeSelect>
          </div>
          {loading && (
            <span className="flex items-center">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={total === 0 || exporting !== null}>
            {exporting !== null && <Spinner />}
            {exporting !== null ? `Exporting ${exporting.toLocaleString()} of ${total.toLocaleString()}…` : "Export CSV"}
          </Button>
          {canEdit && (
            <AddVotersDialog
              electionId={electionId}
              disabled={!editable || atLimit}
              googleAccess={googleAccess}
              settingsHref={canSwitchAccess && !googleAccess ? settingsHref : null}
              onAdded={reload}
            />
          )}
        </div>
      </div>

      {atLimit && editable && (
        <Notice tone="warning">
          {googleAccess ? (
            <>This election has reached the maximum of {limits.votersPerElection.toLocaleString()} voters. Contact us if you need more.</>
          ) : (
            <>
              You&apos;ve reached this election&apos;s limit of {limits.votersPerElection.toLocaleString()} voters.
              {canSwitchAccess && (
                <>
                  {" "}
                  Need more?{" "}
                  <Link href={settingsHref} className="font-medium underline underline-offset-2">
                    Switch to Google sign-in
                  </Link>{" "}
                  for no voter limit.
                </>
              )}
            </>
          )}
        </Notice>
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
        {total === 0 ? (
          <div className="p-10 text-center">
            <h3 className="mb-1 text-xl font-bold">No voters yet</h3>
            <p className="text-sm text-muted-foreground">
              {googleAccess
                ? "Add each voter's Google email address: one by one, as a pasted list, or from a spreadsheet."
                : "Add voters one by one, paste a list, or import a CSV from a spreadsheet."}
            </p>
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
                <TH>{googleAccess ? "Access" : "Invitation"}</TH>
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
                    <InviteBadge voter={voter} googleAccess={googleAccess} />
                  </TD>
                  <TD>{voter.hasVoted ? <Badge variant="green">Voted</Badge> : <span className="text-xs text-muted-foreground">Not yet</span>}</TD>
                  {canEdit && (
                    <TD className="text-right">
                      {!voter.hasVoted && editable && (
                        <div className="flex justify-end gap-1">
                          {canSend && !googleAccess && voter.inviteStatus !== "notSent" && (
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
                    {loading ? "Loading…" : "No voters match."}
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        )}
        {!complete && next && (
          <div className="border-t border-border/60 p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => fetchPage(next)} disabled={loading}>
              {loading && <Spinner />}
              Load more
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {googleAccess
          ? `${total.toLocaleString()} voters.`
          : `${total.toLocaleString()} of ${limits.votersPerElection.toLocaleString()} voters.`}{" "}
        {!complete && `Showing ${rows.length.toLocaleString()}. `}
        Names and emails are only visible to you and your team.
      </p>

      <EditVoterDialog
        electionId={electionId}
        voter={editing}
        onClose={() => {
          setEditing(null);
          if (!complete) fetchPage(null);
        }}
      />
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
