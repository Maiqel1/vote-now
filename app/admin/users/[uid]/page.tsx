import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLogList, ErrorList } from "@/components/admin/EventLists";
import { LimitsForm } from "@/components/admin/LimitsForm";
import { NoteForm } from "@/components/admin/NoteForm";
import { Empty, KeyValue, LoadFailed, Panel } from "@/components/admin/Panel";
import { UserActions } from "@/components/admin/UserActions";
import { StatusBadge } from "@/components/election/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requireSuperadminPage } from "@/lib/auth/superadmin";
import { formatDateTime, timeAgo } from "@/lib/format";
import { FREE_PLAN, LIMIT_KEYS } from "@/lib/plans";
import { adminLog, recentErrors } from "@/lib/server/admin/activity";
import { load } from "@/lib/server/admin/load";
import { getAdminNote } from "@/lib/server/admin/notes";
import { getAdminUser } from "@/lib/server/admin/users";

export const metadata = { title: "User" };

const ROLE_LABELS = { owner: "Owner", admin: "Co-admin", observer: "Observer" } as const;

export default async function AdminUserPage({ params }: { params: { uid: string } }) {
  const admin = await requireSuperadminPage();
  const detail = await getAdminUser(params.uid);
  if (!detail) notFound();
  const { user, elections } = detail;
  const [note, errors, history] = await Promise.all([
    getAdminNote("user", user.uid),
    load("user errors", () => recentErrors({ uid: user.uid, limit: 20 })),
    load("user history", () => adminLog({ targetId: user.uid, limit: 20 })),
  ]);
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-brand-strong">
          ← All users
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{user.name || user.email}</h1>
          {user.disabled && <Badge variant="red">Disabled</Badge>}
          {user.emailVerified ? <Badge variant="green">Verified</Badge> : <Badge variant="amber">Unverified</Badge>}
          {!user.hasProfile && <Badge>No profile</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Account">
          <KeyValue
            items={[
              ["Email", user.email || "—"],
              ["Sign-in method", user.providers.join(", ") || "—"],
              ["Joined", `${formatDateTime(user.createdAt)} (${timeAgo(user.createdAt, now)})`],
              ["Last sign-in", user.lastSignInAt ? `${formatDateTime(user.lastSignInAt)} (${timeAgo(user.lastSignInAt, now)})` : "never"],
              ["Last active", timeAgo(user.lastActiveAt, now)],
              ["UID", <span key="uid" className="font-mono text-xs">{user.uid}</span>],
            ]}
          />
          {!user.hasProfile && (
            <p className="mt-4 text-xs text-muted-foreground">
              This sign-in exists but the VoteNow profile was never created, usually because sign-up was interrupted or sign-ups were
              paused. They can finish by signing in again.
            </p>
          )}
        </Panel>
        <Panel title="Support actions" description="Every action is recorded in the admin log.">
          <UserActions user={user} isSelf={user.uid === admin.uid} />
        </Panel>
      </div>

      <Panel title="Elections" description="Everything they own or help run" flush>
        {elections.length === 0 ? (
          <div className="p-5">
            <Empty>No elections yet.</Empty>
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Election</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="text-right">Voters</TH>
                <TH>Closes</TH>
              </tr>
            </THead>
            <TBody>
              {elections.map((e) => (
                <TR key={e.id}>
                  <TD className="max-w-[280px]">
                    <Link href={`/admin/elections/${e.id}`} className="block truncate font-medium text-foreground hover:underline">
                      {e.title}
                    </Link>
                    <div className="truncate text-xs text-muted-foreground">{e.orgName}</div>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{ROLE_LABELS[e.role]}</TD>
                  <TD>
                    <StatusBadge status={e.status} />
                  </TD>
                  <TD className="text-right tabular-nums text-muted-foreground">{e.voters.toLocaleString()}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(e.endsAt, now)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Limits" description="Raise limits for this person. Defaults are the free plan.">
          <LimitsForm kind="user" id={user.uid} overrides={user.limits} inherited={FREE_PLAN} fields={LIMIT_KEYS} />
        </Panel>
        <Panel title="Internal note">
          <NoteForm kind="user" id={user.uid} initial={note.text} updatedAt={note.updatedAt} updatedBy={note.updatedBy} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent errors" description="Server errors while they were signed in, last 14 days">
          {errors.ok ? <ErrorList entries={errors.data} /> : <LoadFailed error={errors.error} />}
        </Panel>
        <Panel title="Support history">
          {history.ok ? <AdminLogList entries={history.data} showTarget={false} /> : <LoadFailed error={history.error} />}
        </Panel>
      </div>
    </div>
  );
}
