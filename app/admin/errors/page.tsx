import Link from "next/link";
import { ErrorList } from "@/components/admin/EventLists";
import { LoadFailed, PageHeader, Panel } from "@/components/admin/Panel";
import { recentErrors } from "@/lib/server/admin/activity";
import { load } from "@/lib/server/admin/load";

export const metadata = { title: "Errors" };

export default async function AdminErrorsPage({ searchParams }: { searchParams: { uid?: string; election?: string } }) {
  const uid = searchParams.uid?.trim() || undefined;
  const electionId = searchParams.election?.trim() || undefined;
  const errors = await load("errors", () => recentErrors({ uid, electionId, limit: 150 }));

  return (
    <div>
      <PageHeader
        title="Errors"
        description="Server errors behind “Something went wrong” messages. Kept for 14 days. Click one to see where it happened."
        action={
          uid || electionId ? (
            <Link href="/admin/errors" className="text-xs text-brand-strong hover:underline">
              Clear filter
            </Link>
          ) : undefined
        }
      />
      <Panel>{errors.ok ? <ErrorList entries={errors.data} /> : <LoadFailed error={errors.error} />}</Panel>
    </div>
  );
}
