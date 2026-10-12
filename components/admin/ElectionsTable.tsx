"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { STATUS_LABELS } from "@/lib/election-status";
import { timeAgo } from "@/lib/format";
import type { AdminElectionRow } from "@/lib/server/admin/elections";
import type { EffectiveStatus } from "@/lib/types";

const SORTS = {
  created: { label: "Newest first", compare: (a: AdminElectionRow, b: AdminElectionRow) => b.createdAt - a.createdAt },
  closing: { label: "Closing soonest", compare: (a: AdminElectionRow, b: AdminElectionRow) => a.endsAt - b.endsAt },
  voters: { label: "Most voters", compare: (a: AdminElectionRow, b: AdminElectionRow) => b.voters - a.voters },
  turnout: { label: "Highest turnout", compare: (a: AdminElectionRow, b: AdminElectionRow) => b.turnout - a.turnout },
} as const;

type SortKey = keyof typeof SORTS;
type StatusFilter = EffectiveStatus | "all" | "active";

const PAGE = 200;

export function ElectionsTable({ elections, initialStatus }: { elections: AdminElectionRow[]; initialStatus?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(
    initialStatus && (initialStatus in STATUS_LABELS || initialStatus === "active") ? (initialStatus as StatusFilter) : "all",
  );
  const [sort, setSort] = useState<SortKey>("created");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return elections
      .filter((e) => status === "all" || e.status === status || (status === "active" && (e.status === "open" || e.status === "paused")))
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.slug.includes(q) ||
          e.orgName.toLowerCase().includes(q) ||
          e.ownerEmail.toLowerCase().includes(q) ||
          e.id === query.trim(),
      )
      .sort(SORTS[sort].compare);
  }, [elections, query, status, sort]);
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search title, organisation, URL or owner" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-sm" />
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="sm:w-44">
          <option value="all">All statuses</option>
          <option value="active">Live or paused</option>
          {(Object.keys(STATUS_LABELS) as EffectiveStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="sm:w-44">
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center text-xs text-muted-foreground sm:ml-auto">
          {matches.length.toLocaleString()} of {elections.length.toLocaleString()}
        </div>
      </div>
      <div className="surface overflow-hidden rounded-2xl">
        <Table>
          <THead>
            <tr>
              <TH>Election</TH>
              <TH>Owner</TH>
              <TH>Status</TH>
              <TH className="text-right">Voters</TH>
              <TH className="text-right">Turnout</TH>
              <TH>Schedule</TH>
            </tr>
          </THead>
          <TBody>
            {matches.slice(0, PAGE).map((e) => (
              <TR key={e.id}>
                <TD className="max-w-[280px]">
                  <Link href={`/admin/elections/${e.id}`} className="block min-w-0 hover:underline">
                    <div className="truncate font-medium text-foreground">{e.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {e.orgName} · /e/{e.slug}
                    </div>
                  </Link>
                </TD>
                <TD className="max-w-[200px] truncate text-xs text-muted-foreground">
                  <Link href={`/admin/users/${e.ownerId}`} className="hover:underline">
                    {e.ownerEmail || e.ownerId}
                  </Link>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={e.status} />
                    {e.customLimits && <Badge variant="blue">Custom limits</Badge>}
                  </div>
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">
                  {e.voters.toLocaleString()}
                  <div className="text-[11px]">{e.invited.toLocaleString()} invited</div>
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">
                  {e.status === "draft" || e.status === "scheduled" ? "—" : `${e.turnout}%`}
                  {e.voted > 0 && <div className="text-[11px]">{e.voted.toLocaleString()} voted</div>}
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">
                  {e.status === "draft" || e.status === "scheduled"
                    ? `opens ${timeAgo(e.startsAt, now)}`
                    : e.status === "closed"
                      ? `closed ${timeAgo(e.endsAt, now)}`
                      : `closes ${timeAgo(e.endsAt, now)}`}
                </TD>
              </TR>
            ))}
            {matches.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No elections match.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
      {matches.length > PAGE && <p className="text-xs text-muted-foreground">Showing the first {PAGE} matches. Narrow the search to see the rest.</p>}
    </div>
  );
}
