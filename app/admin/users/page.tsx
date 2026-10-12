import { LoadFailed, PageHeader } from "@/components/admin/Panel";
import { UsersTable } from "@/components/admin/UsersTable";
import { load } from "@/lib/server/admin/load";
import { listAdminUsers } from "@/lib/server/admin/users";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: { filter?: string } }) {
  const users = await load("users", listAdminUsers);
  return (
    <div>
      <PageHeader title="Users" description="Every organiser account, from Firebase sign-in joined with their VoteNow profile." />
      {users.ok ? <UsersTable users={users.data} initialFilter={searchParams.filter} /> : <LoadFailed error={users.error} />}
    </div>
  );
}
