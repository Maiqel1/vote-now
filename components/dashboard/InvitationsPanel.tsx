"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  previewInvitation,
  retryFailedInvitations,
  saveInviteMessage,
  sendInvitationsChunk,
  startReminderRound,
} from "@/lib/actions/invitations";
import { FREE_PLAN } from "@/lib/plans";

export interface InvitationStats {
  notSent: number;
  sent: number;
  printed: number;
  failed: number;
  reminderDue: number;
  voted: number;
  total: number;
}

interface SendProgress {
  label: string;
  done: number;
  total: number;
}

export function InvitationsPanel({
  electionId,
  stats,
  message: initialMessage,
  canEdit,
  canSend,
  sendBlockedReason,
  remindersAllowed,
  reminderRound,
  emailsLeftToday,
}: {
  electionId: string;
  stats: InvitationStats;
  message: string;
  canEdit: boolean;
  canSend: boolean;
  sendBlockedReason: React.ReactNode | null;
  remindersAllowed: boolean;
  reminderRound: number;
  emailsLeftToday: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [savingMessage, setSavingMessage] = useState(false);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const busy = progress !== null;

  async function persistMessage(): Promise<boolean> {
    if (message === initialMessage) return true;
    setSavingMessage(true);
    const result = await saveInviteMessage(electionId, message);
    setSavingMessage(false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    return true;
  }

  async function showPreview() {
    const result = await previewInvitation(electionId, message);
    if (!result.ok) toast.error(result.error);
    else setPreview(result.data);
  }

  async function sendLoop(kind: "invite" | "reminder", total: number) {
    if (!(await persistMessage())) return;
    let done = 0;
    let failed = 0;
    let skipped = 0;
    setNotice(null);
    setProgress({ label: kind === "invite" ? "Sending invitations" : "Sending reminders", done, total });

    for (let guard = 0; guard < 100; guard++) {
      const result = await sendInvitationsChunk(electionId, kind);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
        break;
      }
      const r = result.data;
      done += r.sent + r.failed + r.skipped;
      failed += r.failed;
      skipped += r.skipped;
      setProgress({ label: kind === "invite" ? "Sending invitations" : "Sending reminders", done, total: Math.max(total, done + r.remaining) });

      if (r.capReached) {
        setNotice({
          tone: "warning",
          text: `The platform's daily email limit was reached after ${done} emails. The rest will send when you click again tomorrow.`,
        });
        break;
      }
      if (r.remaining === 0 || r.sent + r.failed + r.skipped === 0) {
        const parts = [`${done - failed - skipped} sent`];
        if (failed) parts.push(`${failed} failed`);
        if (skipped) parts.push(`${skipped} skipped by the staging allowlist`);
        setNotice({ tone: failed ? "warning" : "success", text: `Done: ${parts.join(", ")}.` });
        break;
      }
    }
    setProgress(null);
    router.refresh();
  }

  async function startReminders() {
    const result = await startReminderRound(electionId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await sendLoop("reminder", result.data.due);
  }

  async function retryFailed() {
    const result = await retryFailedInvitations(electionId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data.queued === 0) {
      toast.info("Nothing to retry. Those voters have reached the email limit; print slips for them instead.");
      return;
    }
    await sendLoop("invite", result.data.queued);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {sendBlockedReason && <Notice tone="warning">{sendBlockedReason}</Notice>}

        <section className="surface space-y-4 rounded-2xl p-6">
          <div>
            <h2 className="text-xl font-bold">Invitation email</h2>
            <p className="text-sm text-muted-foreground">
              Every voter gets a personal “Cast your vote” button and a backup code. Add an optional note from your organization.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Personal message (optional)</Label>
            <Textarea
              id="message"
              maxLength={1000}
              placeholder="e.g. Please vote before Friday. Results will be announced at the general meeting."
              value={message}
              disabled={!canEdit || busy}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={showPreview}>
              Preview email
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                disabled={savingMessage || message === initialMessage}
                onClick={async () => {
                  if (await persistMessage()) {
                    toast.success("Message saved");
                    router.refresh();
                  }
                }}
              >
                {savingMessage && <Spinner />}
                Save message
              </Button>
            )}
          </div>
        </section>

        {progress && (
          <div className="surface space-y-3 rounded-2xl p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Spinner className="text-brand-strong" /> {progress.label}…
              </span>
              <span className="text-muted-foreground">
                {progress.done} / {progress.total}
              </span>
            </div>
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            <p className="text-xs text-muted-foreground">Keep this tab open until sending finishes.</p>
          </div>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        {canEdit && (
          <section className="surface space-y-4 rounded-2xl p-6">
            <h2 className="text-xl font-bold">Send</h2>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <div>
                <div className="text-sm font-medium">Invitations</div>
                <div className="text-xs text-muted-foreground">
                  {stats.notSent > 0 ? `${stats.notSent} voter${stats.notSent === 1 ? " hasn't" : "s haven't"} been invited yet` : "Everyone on the list has been invited"}
                </div>
              </div>
              <Button disabled={!canSend || busy || stats.notSent === 0} onClick={() => sendLoop("invite", stats.notSent)}>
                Send {stats.notSent > 0 ? stats.notSent : ""} invitation{stats.notSent === 1 ? "" : "s"}
              </Button>
            </div>

            {stats.failed > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
                <div>
                  <div className="text-sm font-medium text-danger">{stats.failed} failed</div>
                  <div className="text-xs text-muted-foreground">
                    Usually a typo in the address. <Link href={`/dashboard/e/${electionId}/voters`} className="underline">Check the voter list</Link>.
                  </div>
                </div>
                <Button variant="outline" disabled={!canSend || busy} onClick={retryFailed}>
                  Retry failed
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <div>
                <div className="text-sm font-medium">
                  Reminders · round {Math.min(reminderRound + (stats.reminderDue > 0 ? 0 : 1), FREE_PLAN.reminderRounds)} of {FREE_PLAN.reminderRounds}
                </div>
                <div className="text-xs text-muted-foreground">
                  Emails a fresh link to invited voters who haven&apos;t voted. Available while voting is open.
                </div>
              </div>
              {stats.reminderDue > 0 ? (
                <Button variant="outline" disabled={!canSend || busy} onClick={() => sendLoop("reminder", stats.reminderDue)}>
                  Continue ({stats.reminderDue} left)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={!canSend || busy || !remindersAllowed || reminderRound >= FREE_PLAN.reminderRounds}
                  onClick={startReminders}
                >
                  Send reminders
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform emails left today: {emailsLeftToday}. Each voter can receive up to {FREE_PLAN.invitesPerVoter} emails in total.
            </p>
          </section>
        )}
      </div>

      <aside className="space-y-3">
        <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Delivery</h2>
        {[
          ["On the list", stats.total],
          ["Not invited", stats.notSent],
          ["Emailed", stats.sent],
          ["Slips printed", stats.printed],
          ["Failed", stats.failed],
          ["Voted", stats.voted],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </aside>

      <Dialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{preview?.subject}</DialogTitle>
          </DialogHeader>
          {preview && <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[65vh] w-full rounded-xl bg-white" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
