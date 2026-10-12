import Link from "next/link";
import { AdminLogList } from "@/components/admin/EventLists";
import { Empty, LoadFailed, PageHeader, Panel } from "@/components/admin/Panel";
import { auditLabel, describeAuditMeta } from "@/lib/audit-labels";
import { formatDateTime, timeAgo } from "@/lib/format";
import { adminLog, platformActivity } from "@/lib/server/admin/activity";
import { load } from "@/lib/server/admin/load";
import { cn } from "@/lib/utils";

export const metadata = { title: "Activity" };

export default async function AdminActivityPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "admin" ? "admin" : "platform";
  const now = Date.now();

  const tabs = (
    <div className="mb-4 inline-flex rounded-xl border border-border bg-muted/50 p-1 text-sm">
      {[
        { key: "platform", label: "Platform activity", href: "/admin/activity" },
        { key: "admin", label: "Admin log", href: "/admin/activity?tab=admin" },
      ].map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn("rounded-lg px-3 py-1.5 transition-colors", tab === t.key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (tab === "admin") {
    const entries = await load("admin log", () => adminLog({ limit: 150 }));
    return (
      <div>
        <PageHeader title="Activity" description="Every action taken from this console, newest first." />
        {tabs}
        <Panel>{entries.ok ? <AdminLogList entries={entries.data} /> : <LoadFailed error={entries.error} />}</Panel>
      </div>
    );
  }

  const entries = await load("platform activity", () => platformActivity(80));
  return (
    <div>
      <PageHeader title="Activity" description="The latest entries from every election's activity log, newest first." />
      {tabs}
      <Panel>
        {!entries.ok ? (
          <LoadFailed error={entries.error} />
        ) : entries.data.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {entries.data.map((entry) => {
              const detail = describeAuditMeta(entry);
              return (
                <li key={`${entry.electionId}-${entry.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                    <span className="text-foreground/75">{auditLabel(entry.action)}</span>
                    {detail && <span className="text-muted-foreground"> · {detail}</span>}
                    <span className="text-xs text-muted-foreground">
                      {" · "}
                      <Link href={`/admin/elections/${entry.electionId}`} className="hover:underline">
                        {entry.electionTitle || "Deleted election"}
                      </Link>
                    </span>
                  </div>
                  <time className="text-xs text-muted-foreground" title={formatDateTime(entry.at)}>
                    {timeAgo(entry.at, now)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
