import Link from "next/link";
import { BarChart } from "@/components/admin/BarChart";
import { Empty, KeyValue, LoadFailed, PageHeader, Panel, StatTile } from "@/components/admin/Panel";
import { TestEmailForm } from "@/components/admin/PlatformForms";
import { Badge } from "@/components/ui/badge";
import { requireSuperadminPage } from "@/lib/auth/superadmin";
import { timeAgo } from "@/lib/format";
import { emailConfig, recentInviteFailures } from "@/lib/server/admin/email";
import { load } from "@/lib/server/admin/load";
import { emailStats } from "@/lib/server/admin/overview";
import { liveChecks } from "@/lib/server/admin/system";

export const metadata = { title: "Email" };

export default async function AdminEmailPage() {
  const admin = await requireSuperadminPage();
  const config = emailConfig();
  const [stats, failures, checks] = await Promise.all([
    load("email stats", emailStats),
    load("invite failures", () => recentInviteFailures(40)),
    load("live checks", liveChecks),
  ]);
  const smtp = checks.ok ? checks.data.find((c) => c.name === "Email (SMTP)") : undefined;
  const now = Date.now();

  return (
    <div className="space-y-6">
      <PageHeader title="Email" description="Delivery health, daily usage and failed invitations." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Sent today" value={stats.ok ? stats.data.today.toLocaleString() : "—"} hint="UTC day" />
        <StatTile label="Daily cap" value={stats.ok ? stats.data.cap.toLocaleString() : "—"} hint={<Link href="/admin/settings" className="hover:underline">Change in Settings</Link>} />
        <StatTile
          label="Last 14 days"
          value={stats.ok ? stats.data.byDay.reduce((s, d) => s + d.count, 0).toLocaleString() : "—"}
          hint="emails sent"
        />
        <StatTile
          label="Connection"
          value={smtp ? (smtp.ok ? "Working" : "Failing") : "—"}
          hint={smtp?.detail}
          tone={smtp && !smtp.ok ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Emails per day" description="Last 14 days">
          {stats.ok ? <BarChart data={stats.data.byDay} unit={["email", "emails"]} /> : <LoadFailed error={stats.error} />}
        </Panel>
        <Panel title="Configuration">
          <KeyValue
            items={[
              ["Transport", <Badge key="t" variant={config.transport === "log" ? "amber" : "green"}>{config.transport}</Badge>],
              ["From", config.from],
              ["SMTP host", config.smtpHost || "—"],
              [
                "Allowlist",
                config.allowlist ? (
                  <span key="a" className="break-all">{config.allowlist}</span>
                ) : (
                  "Off: every address receives email"
                ),
              ],
            ]}
          />
          <div className="mt-5 border-t border-border/60 pt-5">
            <div className="mb-2 text-xs text-muted-foreground">Send a test email</div>
            <TestEmailForm defaultTo={admin.email} />
          </div>
        </Panel>
      </div>

      <Panel title="Failed invitations" description="Most recent first, across all elections" flush>
        {!failures.ok ? (
          <div className="p-5">
            <LoadFailed error={failures.error} />
          </div>
        ) : failures.data.length === 0 ? (
          <div className="p-5">
            <Empty>No failed invitations.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {failures.data.map((f) => (
              <li key={`${f.electionId}-${f.voterId}`} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/voters?email=${encodeURIComponent(f.email)}`} className="font-medium text-foreground hover:underline">
                    {f.email}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {" · "}
                    <Link href={`/admin/elections/${f.electionId}`} className="hover:underline">
                      {f.electionTitle}
                    </Link>
                  </span>
                  <div className="break-words text-xs text-muted-foreground">{f.error ?? "Unknown error"}</div>
                </div>
                <span className="text-xs text-muted-foreground">{timeAgo(f.sentAt, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
