import Link from "next/link";
import { ElectionNav } from "@/components/dashboard/ElectionNav";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { getEffectiveStatus } from "@/lib/election-status";
import { loadElectionPage } from "@/lib/server/page";

export default async function ElectionLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const { election, role } = await loadElectionPage(params.id);
  const status = getEffectiveStatus(election);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 md:px-6">
      <Link href="/dashboard" className="mb-4 inline-block text-xs text-muted-foreground hover:text-brand-strong">
        ← All elections
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {role === "observer" && <Badge variant="blue">Observer · read-only</Badge>}
          </div>
          <h1 className="truncate text-2xl font-bold md:text-3xl">{election.title}</h1>
          <p className="text-sm text-muted-foreground">{election.orgName}</p>
        </div>
        <Link
          href={`/e/${election.slug}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground"
        >
          Public page
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </Link>
      </div>
      <ElectionNav electionId={election.id} />
      <div className="pt-8">{children}</div>
    </main>
  );
}
