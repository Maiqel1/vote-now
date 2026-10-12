import { KeyValue, LoadFailed, PageHeader, Panel } from "@/components/admin/Panel";
import { Badge } from "@/components/ui/badge";
import { load } from "@/lib/server/admin/load";
import { environmentInfo, envChecklist, liveChecks } from "@/lib/server/admin/system";

export const metadata = { title: "System" };

export default async function AdminSystemPage() {
  const env = environmentInfo();
  const checks = await load("live checks", liveChecks);
  const config = envChecklist();

  return (
    <div className="space-y-6">
      <PageHeader title="System" description="What this deployment is running and whether its services respond." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Deployment">
          <KeyValue
            items={[
              ["Environment", env.label],
              ["Site URL", env.appUrl || "—"],
              ["Firebase project", env.firebaseProject || "—"],
              ["Branch", env.branch ?? "—"],
              ["Commit", env.commit ? <span key="c" className="font-mono text-xs">{env.commit}</span> : "—"],
              ["Region", env.region ?? "—"],
            ]}
          />
          {env.commitMessage && <p className="mt-4 truncate text-xs text-muted-foreground">“{env.commitMessage.split("\n")[0]}”</p>}
        </Panel>

        <Panel title="Live checks" description="Run when this page loads">
          {!checks.ok ? (
            <LoadFailed error={checks.error} />
          ) : (
            <ul className="space-y-3 text-sm">
              {checks.data.map((c) => (
                <li key={c.name} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="break-words text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{c.ms} ms</span>
                    {c.ok ? <Badge variant="green">OK</Badge> : <Badge variant="red">Failing</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Configuration" description="Whether each setting is present. Values are never shown." flush>
        <ul className="divide-y divide-border/50 text-sm">
          {config.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="text-foreground">{c.label}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{c.name}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {c.note && <span className="hidden text-xs text-muted-foreground sm:inline">{c.note}</span>}
                {c.set ? <Badge variant="green">Set</Badge> : <Badge variant="amber">Missing</Badge>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
