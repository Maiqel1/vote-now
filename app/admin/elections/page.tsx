import { ElectionsTable } from "@/components/admin/ElectionsTable";
import { LoadFailed, PageHeader } from "@/components/admin/Panel";
import { listAdminElections } from "@/lib/server/admin/elections";
import { load } from "@/lib/server/admin/load";

export const metadata = { title: "Elections" };

export default async function AdminElectionsPage({ searchParams }: { searchParams: { status?: string } }) {
  const elections = await load("elections", listAdminElections);
  return (
    <div>
      <PageHeader title="Elections" description="Every election on the platform, across all organisers." />
      {elections.ok ? <ElectionsTable elections={elections.data} initialStatus={searchParams.status} /> : <LoadFailed error={elections.error} />}
    </div>
  );
}
