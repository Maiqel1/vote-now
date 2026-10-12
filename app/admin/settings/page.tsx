import { PageHeader, Panel } from "@/components/admin/Panel";
import { SettingsForm } from "@/components/admin/PlatformForms";
import { formatDateTime } from "@/lib/format";
import { emailConfig } from "@/lib/server/admin/email";
import { getPlatformConfig } from "@/lib/server/platform-config";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const config = await getPlatformConfig();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        description={
          config.updatedAt
            ? `Runtime switches, no redeploy needed. Last changed ${formatDateTime(config.updatedAt)}${config.updatedBy ? ` by ${config.updatedBy}` : ""}.`
            : "Runtime switches, no redeploy needed."
        }
      />
      <Panel>
        <SettingsForm config={config} envCap={emailConfig().envCap} />
      </Panel>
    </div>
  );
}
