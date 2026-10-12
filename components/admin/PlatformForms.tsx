"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { savePlatformSettings, sendTestEmail } from "@/lib/actions/admin/platform";
import { MAX_BANNER_LENGTH, type PlatformConfig } from "@/lib/platform-config";
import { useAdminAction } from "./use-admin-action";

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsForm({ config, envCap }: { config: PlatformConfig; envCap: number }) {
  const { busy, perform } = useAdminAction();
  const [signupsOpen, setSignupsOpen] = useState(config.signupsOpen);
  const [electionsOpen, setElectionsOpen] = useState(config.electionsOpen);
  const [bannerMessage, setBannerMessage] = useState(config.banner?.message ?? "");
  const [bannerTone, setBannerTone] = useState<"info" | "warning">(config.banner?.tone ?? "info");
  const [cap, setCap] = useState(config.emailDailyCap === null ? "" : String(config.emailDailyCap));

  function save(e: React.FormEvent) {
    e.preventDefault();
    perform(
      () =>
        savePlatformSettings({
          signupsOpen,
          electionsOpen,
          bannerMessage,
          bannerTone,
          emailDailyCap: cap.trim() === "" ? null : Number(cap),
        }),
      "Settings saved. They apply everywhere within 30 seconds.",
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="space-y-5">
        <ToggleRow
          id="signups"
          label="New sign-ups"
          description="When off, nobody new can create an account. Existing users can still sign in."
          checked={signupsOpen}
          onChange={setSignupsOpen}
        />
        <ToggleRow
          id="elections"
          label="New elections"
          description="When off, nobody can create or duplicate an election. Existing elections keep running."
          checked={electionsOpen}
          onChange={setElectionsOpen}
        />
      </div>

      <div className="space-y-2 border-t border-border/60 pt-5">
        <Label htmlFor="banner" className="text-sm font-medium">
          Site-wide banner
        </Label>
        <p className="text-xs text-muted-foreground">Shown on the dashboard and on every voter page. Leave empty to hide it.</p>
        <Textarea
          id="banner"
          value={bannerMessage}
          onChange={(e) => setBannerMessage(e.target.value)}
          maxLength={MAX_BANNER_LENGTH}
          placeholder="e.g. Invitation emails are delayed this morning. Voting links still work."
        />
        <div className="flex items-center justify-between gap-3">
          <NativeSelect value={bannerTone} onChange={(e) => setBannerTone(e.target.value as "info" | "warning")} className="w-40">
            <option value="info">Information</option>
            <option value="warning">Warning</option>
          </NativeSelect>
          <span className="text-xs text-muted-foreground">
            {bannerMessage.length} / {MAX_BANNER_LENGTH}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-5">
        <Label htmlFor="cap" className="text-sm font-medium">
          Daily email cap
        </Label>
        <p className="text-xs text-muted-foreground">
          The most emails the platform sends per day (UTC). Keep it within your email provider&apos;s plan. Leave empty to use the
          server default of {envCap.toLocaleString()}.
        </p>
        <Input id="cap" type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} placeholder={String(envCap)} className="w-40" />
      </div>

      <Button type="submit" disabled={busy}>
        {busy && <Spinner />}
        Save settings
      </Button>
    </form>
  );
}

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const { busy, perform } = useAdminAction();
  const [to, setTo] = useState(defaultTo);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const result = await perform(() => sendTestEmail(to));
    if (result.ok) {
      toast.success(result.data.status === "sent" ? `Test email sent to ${to}` : "Skipped: that address isn't on the email allowlist");
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
      <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
      <Button type="submit" variant="outline" disabled={busy}>
        {busy && <Spinner />}
        Send test email
      </Button>
    </form>
  );
}
