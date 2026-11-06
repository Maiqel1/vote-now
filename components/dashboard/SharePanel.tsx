"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Notice } from "@/components/feedback/Notice";
import { ShareLink } from "@/components/polls/ShareLink";
import { Button } from "@/components/ui/button";
import { GoogleListReminder } from "./VoterAccessOptions";

export function SharePanel({
  electionId,
  slug,
  title,
  orgName,
  opensAt,
  closesAt,
  published,
  closed,
  voters,
}: {
  electionId: string;
  slug: string;
  title: string;
  orgName: string;
  opensAt: string;
  closesAt: string;
  published: boolean;
  closed: boolean;
  voters: number;
}) {
  const path = `/e/${slug}`;
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const voterMessage = (url: string) =>
    [
      `Voting for ${title} (${orgName}) is open from ${opensAt} until ${closesAt}.`,
      "",
      `Open ${url}, tap "Vote now" and continue with Google using the same email address you gave the organizers.`,
    ].join("\n");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(voterMessage(`${origin}${path}`));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the message and copy it yourself.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {!published && (
        <Notice tone="warning">
          Publish the election from the <Link href={`/dashboard/e/${electionId}`} className="underline">overview</Link> before
          sharing the link. Until then, voters will see that the election isn&apos;t available.
        </Notice>
      )}
      {closed && <Notice tone="info">Voting has closed.</Notice>}

      <section className="surface space-y-4 rounded-2xl p-5 md:p-6">
        <div>
          <h2 className="text-lg font-bold">Share your voting link</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No emails are sent in this election. Share this one link wherever your voters are: WhatsApp, Slack, email, Twitter or a
            notice board.
          </p>
        </div>
        <ShareLink path={path} text={title} message={voterMessage} />
      </section>

      <section className="surface space-y-3 rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Message for voters</h2>
          <Button type="button" variant="outline" size="sm" onClick={copyMessage} disabled={!origin}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy message"}
          </Button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 font-sans text-sm leading-relaxed text-foreground/85">
          {voterMessage(origin ? `${origin}${path}` : path)}
        </pre>
      </section>

      <GoogleListReminder />

      <section className="surface space-y-2 rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold">Voters without a Google account</h2>
        <p className="text-sm text-muted-foreground">
          Print a voting slip with a personal code for anyone who can&apos;t sign in with Google. On the{" "}
          <Link href={`/dashboard/e/${electionId}/voters`} className="text-brand-strong underline-offset-4 hover:underline">
            Voters
          </Link>{" "}
          tab, select them and choose <strong>Print slips</strong>.
        </p>
        <p className="text-xs text-muted-foreground">{voters.toLocaleString()} voters on the list.</p>
      </section>
    </div>
  );
}
