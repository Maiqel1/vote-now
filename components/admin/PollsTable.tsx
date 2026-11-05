"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { adminEndPoll, adminSetPollRemoved } from "@/lib/actions/admin/polls";
import { timeAgo } from "@/lib/format";
import type { AdminPollRow } from "@/lib/server/admin/polls";
import { useAdminAction } from "./use-admin-action";

type Filter = "all" | "open" | "closed" | "removed" | "reported";

const STATUS_BADGE = {
  open: { label: "Open", variant: "green" },
  closed: { label: "Closed", variant: "default" },
  removed: { label: "Removed", variant: "red" },
} as const;

const PAGE = 200;

export function PollsTable({ polls, initialQuery }: { polls: AdminPollRow[]; initialQuery?: string }) {
  const { busy, perform } = useAdminAction();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"created" | "votes" | "reports">("created");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return polls
      .filter((p) => filter === "all" || (filter === "reported" ? p.reportCount > 0 : p.status === filter))
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.code === q || (p.creatorEmail ?? "").toLowerCase().includes(q))
      .sort((a, b) =>
        sort === "votes" ? b.votes - a.votes : sort === "reports" ? b.reportCount - a.reportCount : b.createdAt - a.createdAt,
      );
  }, [polls, query, filter, sort]);
  const now = Date.now();

  function end(poll: AdminPollRow) {
    if (!window.confirm(`End "${poll.title}" now? Voting stops and the results become public.`)) return;
    perform(() => adminEndPoll(poll.code), "Poll ended");
  }

  function setRemoved(poll: AdminPollRow, removed: boolean) {
    const message = removed
      ? `Remove "${poll.title}"? Its page will say it was removed for breaking the rules.`
      : `Restore "${poll.title}"? Its page and results become visible again.`;
    if (!window.confirm(message)) return;
    perform(() => adminSetPollRemoved(poll.code, removed), removed ? "Poll removed" : "Poll restored");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search title, code or creator" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-sm" />
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="sm:w-40">
          <option value="all">All polls</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="removed">Removed</option>
          <option value="reported">Reported</option>
        </NativeSelect>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="sm:w-40">
          <option value="created">Newest first</option>
          <option value="votes">Most votes</option>
          <option value="reports">Most reports</option>
        </NativeSelect>
        <div className="flex items-center text-xs text-muted-foreground sm:ml-auto">
          {matches.length.toLocaleString()} of {polls.length.toLocaleString()}
        </div>
      </div>
      <div className="surface overflow-hidden rounded-2xl">
        <Table>
          <THead>
            <tr>
              <TH>Poll</TH>
              <TH>Creator</TH>
              <TH>Status</TH>
              <TH className="text-right">Votes</TH>
              <TH>Timing</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {matches.slice(0, PAGE).map((p) => (
              <TR key={p.code}>
                <TD className="max-w-[300px]">
                  <a href={`/p/${p.code}`} target="_blank" rel="noopener noreferrer" className="block min-w-0 hover:underline">
                    <div className="truncate font-medium text-foreground">{p.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      /p/{p.code} · {p.questions > 1 ? `${p.questions} questions` : `${p.options} options`}
                      {p.hiddenResults ? " · results hidden" : ""}
                    </div>
                  </a>
                </TD>
                <TD className="max-w-[180px] truncate text-xs text-muted-foreground">{p.creatorEmail ?? "Anonymous"}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={STATUS_BADGE[p.status].variant}>{STATUS_BADGE[p.status].label}</Badge>
                    {p.strict && <Badge variant="blue">Google</Badge>}
                    {p.reportCount > 0 && <Badge variant="amber">{p.reportCount} reports</Badge>}
                  </div>
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">{p.votes.toLocaleString()}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">
                  {p.status === "open" ? `closes ${timeAgo(p.endsAt, now)}` : `ended ${timeAgo(p.endsAt, now)}`}
                  <div className="text-[11px]">created {timeAgo(p.createdAt, now)}</div>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    {p.status === "open" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => end(p)}>
                        End
                      </Button>
                    )}
                    {p.status === "removed" ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setRemoved(p, false)}>
                        Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" disabled={busy} onClick={() => setRemoved(p, true)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
            {matches.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No polls match.
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
