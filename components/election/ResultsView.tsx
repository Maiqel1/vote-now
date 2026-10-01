"use client";

import { Badge } from "@/components/ui/badge";
import { useLiveTally } from "@/lib/client/use-live-tally";
import { computeResults, type PositionResult } from "@/lib/results";
import type { Ballot, TallyShard } from "@/lib/types";
import { CandidateAvatar } from "./CandidateAvatar";

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400" aria-hidden>
      <path d="M2 19h20v2H2v-2zM2 6l5 8 5-7 5 7 5-8v11H2V6z" />
    </svg>
  );
}

function Bar({ pct, highlight }: { pct: number; highlight: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ background: "hsl(224 35% 14%)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: highlight
            ? "linear-gradient(90deg, hsl(38 92% 45%), hsl(38 95% 62%))"
            : "linear-gradient(90deg, hsl(224 35% 22%), hsl(224 35% 30%))",
          boxShadow: highlight ? "0 0 12px hsl(38 92% 56% / 0.4)" : "none",
        }}
      />
    </div>
  );
}

function PositionResultCard({ result, index, final }: { result: PositionResult; index: number; final: boolean }) {
  const { position } = result;
  const hasVotes = result.participating > 0;
  const winnerLabel = final ? "Winner" : "Leading";

  return (
    <div className="glass animate-slide-up overflow-hidden rounded-2xl" style={{ animationDelay: `${Math.min(index, 8) * 0.08}s` }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-5">
        <div>
          <h2 className="font-playfair text-xl font-bold text-foreground">{position.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {result.participating} vote{result.participating === 1 ? "" : "s"}
            {result.abstained > 0 && ` · ${result.abstained} abstained`}
            {position.type === "multi" && ` · up to ${position.maxSelections} elected`}
          </p>
        </div>
        {result.tiedIds.length > 0 && <Badge variant="amber">Tie</Badge>}
        {position.type === "yesno" && result.passed !== null && (
          <Badge variant={result.passed ? "green" : "red"}>{result.passed ? (final ? "Approved" : "Leaning yes") : final ? "Rejected" : "Leaning no"}</Badge>
        )}
      </div>

      <div className="space-y-5 px-6 py-6">
        {position.type === "yesno" ? (
          <>
            {position.candidates[0] && (
              <div className="flex items-center gap-3">
                <CandidateAvatar name={position.candidates[0].name} photoUrl={position.candidates[0].photoUrl} className="h-10 w-10" />
                <span className="text-sm font-medium">{position.candidates[0].name}</span>
              </div>
            )}
            {(["yes", "no"] as const).map((choice) => {
              const count = choice === "yes" ? result.yes : result.no;
              const total = result.yes + result.no;
              const pct = total ? (count / total) * 100 : 0;
              const leading = (choice === "yes" && result.passed === true) || (choice === "no" && result.passed === false);
              return (
                <div key={choice} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-foreground/80">{choice}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                      <span className="min-w-[2rem] text-right font-playfair font-semibold tabular-nums">{count}</span>
                    </span>
                  </div>
                  <Bar pct={pct} highlight={leading} />
                </div>
              );
            })}
          </>
        ) : (
          result.entries.map((entry, i) => {
            const isWinner = hasVotes && result.winners.includes(entry.candidate.id);
            const isTied = result.tiedIds.includes(entry.candidate.id);
            return (
              <div key={entry.candidate.id} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isWinner ? "bg-amber-500 text-amber-950" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <CandidateAvatar name={entry.candidate.name} photoUrl={entry.candidate.photoUrl} className="hidden h-8 w-8 text-xs sm:flex" />
                    <span className={`truncate text-sm font-medium ${isWinner ? "text-foreground" : "text-foreground/75"}`}>{entry.candidate.name}</span>
                    {isWinner && (
                      <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-amber-400">
                        <CrownIcon />
                        <span className="hidden sm:inline">{winnerLabel}</span>
                      </span>
                    )}
                    {isTied && <span className="flex-shrink-0 text-[11px] text-amber-300">Tied</span>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className={`text-xs ${isWinner ? "font-semibold text-amber-400" : "text-muted-foreground"}`}>{entry.share.toFixed(1)}%</span>
                    <span className="min-w-[2rem] text-right font-playfair text-sm font-semibold tabular-nums">{entry.votes}</span>
                  </div>
                </div>
                <Bar pct={entry.share} highlight={isWinner} />
              </div>
            );
          })
        )}
        {position.candidates.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No candidates.</p>}
      </div>
    </div>
  );
}

export function ResultsView({
  electionId,
  ballot,
  initialTally,
  eligibleVoters,
  live,
  requireAuth,
  final,
}: {
  electionId: string;
  ballot: Ballot;
  initialTally: TallyShard;
  eligibleVoters: number;
  live: boolean;
  requireAuth: boolean;
  final: boolean;
}) {
  const { tally, live: connected } = useLiveTally(electionId, initialTally, { enabled: live, requireAuth });
  const results = computeResults(ballot, tally);
  const turnout = eligibleVoters > 0 ? (results.totalBallots / eligibleVoters) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 text-center">
          <div className="stat-number">{results.totalBallots.toLocaleString()}</div>
          <div className="mt-1 text-sm tracking-wide text-muted-foreground">Ballots cast</div>
        </div>
        <div className="glass rounded-2xl p-6 text-center">
          <div className="font-playfair text-5xl font-bold leading-none text-foreground">{turnout.toFixed(turnout > 0 && turnout < 10 ? 1 : 0)}%</div>
          <div className="mt-1 text-sm tracking-wide text-muted-foreground">Turnout of {eligibleVoters.toLocaleString()} voters</div>
        </div>
      </div>
      {live && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse-soft bg-emerald-400" : "bg-muted-foreground"}`} />
          {connected ? "Updating live" : "Connecting…"}
        </div>
      )}
      {results.positions.map((result, i) => (
        <PositionResultCard key={result.position.id} result={result} index={i} final={final} />
      ))}
    </div>
  );
}
