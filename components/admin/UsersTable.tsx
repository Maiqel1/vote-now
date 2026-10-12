"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { timeAgo } from "@/lib/format";
import type { AdminUser } from "@/lib/server/admin/users";

const FILTERS = {
  all: { label: "All users", test: () => true },
  unverified: { label: "Unverified email", test: (u: AdminUser) => !u.emailVerified },
  disabled: { label: "Disabled", test: (u: AdminUser) => u.disabled },
  owners: { label: "Own an election", test: (u: AdminUser) => u.owned > 0 },
  new: { label: "Joined in the last 7 days", test: (u: AdminUser) => Date.now() - u.createdAt < 7 * 24 * 60 * 60 * 1000 },
  custom: { label: "Custom limits", test: (u: AdminUser) => Object.keys(u.limits).length > 0 },
  orphan: { label: "No profile (sign-up unfinished)", test: (u: AdminUser) => !u.hasProfile },
} as const;

type FilterKey = keyof typeof FILTERS;

const PAGE = 200;

export function UsersTable({ users, initialFilter }: { users: AdminUser[]; initialFilter?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>(initialFilter && initialFilter in FILTERS ? (initialFilter as FilterKey) : "all");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) => FILTERS[filter].test(u) && (!q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.uid === query.trim()),
    );
  }, [users, query, filter]);
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search by email, name or UID" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-sm" />
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)} className="sm:w-64">
          {Object.entries(FILTERS).map(([key, f]) => (
            <option key={key} value={key}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center text-xs text-muted-foreground sm:ml-auto">
          {matches.length.toLocaleString()} of {users.length.toLocaleString()}
        </div>
      </div>
      <div className="surface overflow-hidden rounded-2xl">
        <Table>
          <THead>
            <tr>
              <TH>User</TH>
              <TH>Sign-in</TH>
              <TH>Status</TH>
              <TH className="text-right">Elections</TH>
              <TH>Joined</TH>
              <TH>Last active</TH>
            </tr>
          </THead>
          <TBody>
            {matches.slice(0, PAGE).map((u) => (
              <TR key={u.uid}>
                <TD className="max-w-[260px]">
                  <Link href={`/admin/users/${u.uid}`} className="block min-w-0 hover:underline">
                    <div className="truncate font-medium text-foreground">{u.name || u.email || u.uid}</div>
                    {u.name && <div className="truncate text-xs text-muted-foreground">{u.email}</div>}
                  </Link>
                </TD>
                <TD className="text-xs text-muted-foreground">{u.providers.join(", ") || "—"}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {u.disabled && <Badge variant="red">Disabled</Badge>}
                    {u.emailVerified ? <Badge variant="green">Verified</Badge> : <Badge variant="amber">Unverified</Badge>}
                    {Object.keys(u.limits).length > 0 && <Badge variant="blue">Custom limits</Badge>}
                    {!u.hasProfile && <Badge>No profile</Badge>}
                  </div>
                </TD>
                <TD className="text-right tabular-nums text-muted-foreground">
                  {u.owned}
                  {u.member > 0 && <span className="text-xs"> +{u.member}</span>}
                </TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(u.createdAt, now)}</TD>
                <TD className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(u.lastActiveAt, now)}</TD>
              </TR>
            ))}
            {matches.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No users match.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
      {matches.length > PAGE && (
        <p className="text-xs text-muted-foreground">Showing the newest {PAGE} matches. Narrow the search to see the rest.</p>
      )}
      <p className="text-xs text-muted-foreground">Elections: owned, plus any they help run.</p>
    </div>
  );
}
