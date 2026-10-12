import { auditLabel, describeAuditMeta } from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/format";
import { electionDoc } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";
import type { AuditEntry } from "@/lib/types";

export const metadata = { title: "Activity" };

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const { election } = await loadElectionPage(params.id);
  const snap = await electionDoc(election.id).collection("audit").orderBy("at", "desc").limit(200).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, "id">) }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A permanent record of every administrative action. It can&apos;t be edited or deleted, which helps resolve disputes.
      </p>
      <div className="surface divide-y divide-border/50 overflow-hidden rounded-2xl">
        {entries.length === 0 && <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>}
        {entries.map((entry) => {
          const detail = describeAuditMeta(entry, election.timezone);
          return (
            <div key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 text-sm">
              <div>
                <span className="font-medium text-foreground">{entry.actorName}</span>{" "}
                <span className="text-foreground/75">{auditLabel(entry.action)}</span>
                {detail && <span className="text-muted-foreground"> · {detail}</span>}
              </div>
              <time className="text-xs text-muted-foreground">{formatDateTime(entry.at, election.timezone)}</time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
