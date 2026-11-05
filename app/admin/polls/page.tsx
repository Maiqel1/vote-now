import { LoadFailed, PageHeader } from "@/components/admin/Panel";
import { PollsTable } from "@/components/admin/PollsTable";
import { listAdminPolls } from "@/lib/server/admin/polls";
import { load } from "@/lib/server/admin/load";

export const metadata = { title: "Polls" };

export default async function AdminPollsPage({ searchParams }: { searchParams: { q?: string } }) {
  const polls = await load("polls", () => listAdminPolls());
  return (
    <div>
      <PageHeader title="Polls" description="The 300 most recent instant polls. Remove anything that breaks the rules." />
      {polls.ok ? <PollsTable polls={polls.data} initialQuery={searchParams.q} /> : <LoadFailed error={polls.error} />}
    </div>
  );
}
