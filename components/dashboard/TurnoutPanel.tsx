"use client";

import { GlowCard } from "@/components/ui/glow-card";
import { Progress } from "@/components/ui/progress";
import { useLiveTally } from "@/lib/client/use-live-tally";
import type { TallyShard } from "@/lib/types";

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <GlowCard innerClassName="p-5">
      <div className={accent ? "stat text-brand-strong" : "stat text-foreground"}>{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
    </GlowCard>
  );
}

export function TurnoutPanel({
  electionId,
  initialTally,
  voters,
  invited,
  live,
}: {
  electionId: string;
  initialTally: TallyShard;
  voters: number;
  invited: number;
  live: boolean;
}) {
  const { tally, live: connected } = useLiveTally(electionId, initialTally, { enabled: live, requireAuth: true });
  const voted = tally.total;
  const turnout = voters > 0 ? (voted / voters) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Eligible voters" value={voters.toLocaleString()} />
        <Stat label="Invited" value={invited.toLocaleString()} />
        <Stat label="Voted" value={voted.toLocaleString()} accent />
        <Stat label="Turnout" value={`${turnout.toFixed(turnout > 0 && turnout < 10 ? 1 : 0)}%`} />
      </div>
      <div className="surface rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {voted.toLocaleString()} of {voters.toLocaleString()} voters have voted
          </span>
          {live && (
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse-soft bg-success" : "bg-muted-foreground"}`} />
              {connected ? "Live" : "Connecting…"}
            </span>
          )}
        </div>
        <Progress value={turnout} className="h-3" />
      </div>
    </div>
  );
}
