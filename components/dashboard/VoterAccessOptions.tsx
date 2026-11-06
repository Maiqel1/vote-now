"use client";

import { cn } from "@/lib/utils";
import type { VoterAccess } from "@/lib/voter-access";

const GOOGLE_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

const OPTIONS: { value: VoterAccess; title: string; description: string }[] = [
  {
    value: "email",
    title: "Email invitations",
    description: "Every voter gets a personal one-click link and a backup code by email.",
  },
  {
    value: "google",
    title: "Google sign-in: no emails, no voter limit",
    description:
      "Voters sign in with Google using the same email address that's on your voter list. Anyone whose email isn't on the list can't vote, so add each voter's Google or Gmail address.",
  },
];

export function GoogleListReminder({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-info/25 bg-info-soft p-4 text-xs leading-relaxed text-info", className)}>
      <span className="font-semibold">Google sign-in:</span> voters must sign in with Google using the same email address
      that&apos;s on this list. Anyone whose email isn&apos;t on the list can&apos;t vote. Voters without a Google account can use a
      printed voting slip.
    </div>
  );
}

export function VoterAccessOptions({
  value,
  onChange,
  disabled,
}: {
  value: VoterAccess;
  onChange: (value: VoterAccess) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2" role="radiogroup">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          const unavailable = option.value === "google" && !GOOGLE_ENABLED;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || unavailable}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                selected ? "border-brand/40 bg-brand-soft" : "border-border bg-muted/50 hover:bg-secondary/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-brand bg-brand" : "border-border",
                )}
              >
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {unavailable ? "Not available yet." : option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {value === "google" && (
        <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-xs leading-relaxed text-muted-foreground">
          <div className="mb-2 text-sm font-medium text-foreground">How Google sign-in works</div>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Add your voters&apos; Google email addresses to the voter list.</li>
            <li>Share one voting link: on WhatsApp, Slack, email, Twitter or wherever your voters are.</li>
            <li>Each voter signs in with Google. Only emails on your list can vote.</li>
          </ol>
          <p className="mt-2">Voters without a Google account can use a printed voting slip with a code.</p>
        </div>
      )}
    </div>
  );
}
