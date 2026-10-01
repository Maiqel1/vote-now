"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/dashboard/ConfirmButton";
import { VisibilityOptions } from "@/components/dashboard/VisibilityOptions";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteElection,
  duplicateElection,
  purgeVoterData,
  updateBallotOptions,
  updateBranding,
  updateDetails,
  updateResultsVisibility,
  updateSchedule,
} from "@/lib/actions/elections";
import { fromLocalInput, toLocalInput } from "@/lib/client/datetime";
import { uploadElectionImage } from "@/lib/client/upload";
import { imageUrl } from "@/lib/image-url";
import type { ActionResult, EffectiveStatus, Election, ResultsVisibility, Role } from "@/lib/types";
import { SettingsSection } from "./SettingsSection";

function useSaver() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function save(action: () => Promise<ActionResult<unknown>>, message: string): Promise<boolean> {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(message);
    router.refresh();
    return true;
  }
  return { busy, save };
}

export function DetailsForm({ election, canEdit }: { election: Election; canEdit: boolean }) {
  const { busy, save } = useSaver();
  const [title, setTitle] = useState(election.title);
  const [orgName, setOrgName] = useState(election.orgName);
  const [description, setDescription] = useState(election.description);
  const [slug, setSlug] = useState(election.slug);

  return (
    <SettingsSection title="Details" description="Shown on the public election page and in voter emails.">
      <div className="space-y-2">
        <Label htmlFor="s-title">Title</Label>
        <Input id="s-title" maxLength={120} value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-org">Organization</Label>
        <Input id="s-org" maxLength={120} value={orgName} disabled={!canEdit} onChange={(e) => setOrgName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-desc">Description</Label>
        <Textarea id="s-desc" maxLength={2000} value={description} disabled={!canEdit} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-slug">Public link</Label>
        <Input
          id="s-slug"
          value={slug}
          maxLength={50}
          disabled={!canEdit || election.status !== "draft"}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
        {election.status !== "draft" && <p className="text-xs text-muted-foreground">The link can't change after publishing.</p>}
      </div>
      {canEdit && (
        <Button disabled={busy} onClick={() => save(() => updateDetails(election.id, { title, orgName, description, slug }), "Details saved")}>
          {busy && <Spinner />}
          Save details
        </Button>
      )}
    </SettingsSection>
  );
}

export function ScheduleForm({ election, status, canEdit }: { election: Election; status: EffectiveStatus; canEdit: boolean }) {
  const { busy, save } = useSaver();
  const [startsAt, setStartsAt] = useState(() => toLocalInput(election.startsAt));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(election.endsAt));
  const editable = canEdit && (status === "draft" || status === "scheduled");

  return (
    <SettingsSection title="Schedule" description={`Times are shown in your browser's timezone. Voters see them in ${election.timezone}.`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="s-start">Voting opens</Label>
          <Input id="s-start" type="datetime-local" value={startsAt} disabled={!editable} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-end">Voting closes</Label>
          <Input id="s-end" type="datetime-local" value={endsAt} disabled={!editable} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>
      {!editable && status !== "draft" && status !== "scheduled" && (
        <p className="text-xs text-muted-foreground">Voting has started. Use “Extend voting” on the overview to change the closing time.</p>
      )}
      {editable && (
        <Button
          disabled={busy}
          onClick={() =>
            save(
              () =>
                updateSchedule(election.id, {
                  startsAt: fromLocalInput(startsAt),
                  endsAt: fromLocalInput(endsAt),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || election.timezone,
                }),
              "Schedule saved",
            )
          }
        >
          {busy && <Spinner />}
          Save schedule
        </Button>
      )}
    </SettingsSection>
  );
}

export function VisibilityForm({ election, canEdit }: { election: Election; canEdit: boolean }) {
  const { busy, save } = useSaver();
  const [value, setValue] = useState<ResultsVisibility>(election.results.visibility);
  const locked = election.results.publishedAt !== null;
  return (
    <SettingsSection title="Results" description="Who can see results on the public page, and when.">
      <VisibilityOptions value={value} onChange={setValue} disabled={!canEdit || locked} />
      {locked && <p className="text-xs text-muted-foreground">Results have been published.</p>}
      {canEdit && !locked && value !== election.results.visibility && (
        <Button disabled={busy} onClick={() => save(() => updateResultsVisibility(election.id, value), "Results visibility saved")}>
          {busy && <Spinner />}
          Save
        </Button>
      )}
    </SettingsSection>
  );
}

export function BallotOptionsForm({ election, locked, canEdit }: { election: Election; locked: boolean; canEdit: boolean }) {
  const { busy, save } = useSaver();
  const [shuffle, setShuffle] = useState(election.ballotOptions.shuffle);
  const [requireAll, setRequireAll] = useState(election.ballotOptions.requireAll);
  const disabled = !canEdit || locked;
  const changed = shuffle !== election.ballotOptions.shuffle || requireAll !== election.ballotOptions.requireAll;

  return (
    <SettingsSection title="Ballot options" description={locked ? "Locked because voting has started." : undefined}>
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">Shuffle candidate order</span>
          <span className="block text-xs text-muted-foreground">Each voter sees candidates in a random order, so nobody benefits from being listed first.</span>
        </span>
        <Switch checked={shuffle} disabled={disabled} onCheckedChange={setShuffle} />
      </label>
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">Require a choice for every position</span>
          <span className="block text-xs text-muted-foreground">Voters can&apos;t skip positions. Turn on “Allow abstain” for positions where abstaining is fine.</span>
        </span>
        <Switch checked={requireAll} disabled={disabled} onCheckedChange={setRequireAll} />
      </label>
      {!disabled && changed && (
        <Button disabled={busy} onClick={() => save(() => updateBallotOptions(election.id, { shuffle, requireAll }), "Ballot options saved")}>
          {busy && <Spinner />}
          Save
        </Button>
      )}
    </SettingsSection>
  );
}

export function BrandingForm({ election, canEdit }: { election: Election; canEdit: boolean }) {
  const { busy, save } = useSaver();
  const [logoUrl, setLogoUrl] = useState(election.logoUrl);
  const [accent, setAccent] = useState(election.accentColor ?? "#f5a524");
  const [useAccent, setUseAccent] = useState(election.accentColor !== null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      setLogoUrl(await uploadElectionImage(election.id, "branding", file, 320));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SettingsSection title="Branding" description="Your logo and colour on the public election page.">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50">
          {logoUrl ? <img src={imageUrl(logoUrl, 64, "fit")} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              {uploading && <Spinner />}
              Upload logo
            </Button>
            {logoUrl && (
              <Button variant="ghost" size="sm" onClick={() => setLogoUrl(null)}>
                Remove
              </Button>
            )}
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={useAccent} disabled={!canEdit} onCheckedChange={setUseAccent} />
        Custom accent colour
        {useAccent && (
          <input
            type="color"
            value={accent}
            disabled={!canEdit}
            onChange={(e) => setAccent(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
          />
        )}
      </label>
      {canEdit && (
        <Button
          disabled={busy || uploading}
          onClick={() => save(() => updateBranding(election.id, { logoUrl, accentColor: useAccent ? accent : null }), "Branding saved")}
        >
          {busy && <Spinner />}
          Save branding
        </Button>
      )}
    </SettingsSection>
  );
}

export function DangerZone({ election, status, role }: { election: Election; status: EffectiveStatus; role: Role }) {
  const router = useRouter();
  const [copyVoters, setCopyVoters] = useState(true);
  const [confirmTitle, setConfirmTitle] = useState("");
  const isOwner = role === "owner";

  return (
    <SettingsSection title="Danger zone" tone="danger" description="Actions here are permanent.">
      {role !== "observer" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4">
          <div>
            <div className="text-sm font-medium">Duplicate election</div>
            <div className="text-xs text-muted-foreground">Copies details and ballot into a new draft, for example next year&apos;s election.</div>
            {election.piiPurgedAt === null && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={copyVoters} onChange={(e) => setCopyVoters(e.target.checked)} className="accent-brand" />
                Also copy the voter list
              </label>
            )}
          </div>
          <ConfirmButton
            variant="outline"
            title="Duplicate this election?"
            description="A new draft is created. Nothing is sent to voters."
            confirmLabel="Duplicate"
            onConfirm={async () => {
              const result = await duplicateElection(election.id, copyVoters);
              if (!result.ok) {
                toast.error(result.error);
                return false;
              }
              toast.success("Copy created");
              router.push(`/dashboard/e/${result.data.id}`);
            }}
          >
            Duplicate
          </ConfirmButton>
        </div>
      )}

      {isOwner && status === "closed" && election.piiPurgedAt === null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4">
          <div>
            <div className="text-sm font-medium">Delete voter data</div>
            <div className="text-xs text-muted-foreground">Removes every voter&apos;s name and email. Results and the activity log are kept.</div>
          </div>
          <ConfirmButton
            variant="outline"
            title="Delete all voter data?"
            description="Names, emails and voting status are permanently deleted. Aggregate results stay. This can't be undone."
            confirmLabel="Delete voter data"
            destructive
            onConfirm={async () => {
              const result = await purgeVoterData(election.id);
              if (!result.ok) {
                toast.error(result.error);
                return false;
              }
              toast.success("Voter data deleted");
              router.refresh();
            }}
          >
            Delete voter data
          </ConfirmButton>
        </div>
      )}

      {isOwner && (
        <div className="space-y-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
          <div>
            <div className="text-sm font-medium text-danger">Delete election</div>
            <div className="text-xs text-muted-foreground">Deletes the election, ballots, results, voters and photos. This can&apos;t be undone.</div>
          </div>
          <Input placeholder={`Type “${election.title}” to confirm`} value={confirmTitle} onChange={(e) => setConfirmTitle(e.target.value)} />
          <ConfirmButton
            variant="destructive"
            title="Delete this election forever?"
            description={<Notice tone="error">Everything about “{election.title}” is permanently deleted.</Notice>}
            confirmLabel="Delete forever"
            destructive
            disabled={confirmTitle.trim() !== election.title}
            onConfirm={async () => {
              const result = await deleteElection(election.id, confirmTitle);
              if (!result.ok) {
                toast.error(result.error);
                return false;
              }
              toast.success("Election deleted");
              router.push("/dashboard");
            }}
          >
            Delete election
          </ConfirmButton>
        </div>
      )}
    </SettingsSection>
  );
}
