"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

type Position = "president" | "vicePresident" | "secretaryGeneral" | "directorOfSport" | "directorOfSocials";

interface Candidate {
  id: string;
  name: string;
  position: Position;
}

interface VoteResults {
  [key: string]: number;
}

const candidates: Candidate[] = [
  { id: "1", name: "Alhassan Usman Adam", position: "president" },
  { id: "2", name: "Ohuoba Nosamudiana David", position: "president" },
  { id: "3", name: "Ikejiaku Miracle", position: "vicePresident" },
  { id: "4", name: "Bello Alimat Ayomide", position: "secretaryGeneral" },
  { id: "5", name: "Akintan Ayomide", position: "directorOfSport" },
  { id: "6", name: "Oladipupo Demilade Christiana", position: "directorOfSocials" },
];

const positionLabels: Record<Position, string> = {
  president: "President",
  vicePresident: "Vice President",
  secretaryGeneral: "Secretary General",
  directorOfSport: "Director of Sport",
  directorOfSocials: "Director of Socials",
};

const positionIcons: Record<Position, React.ReactNode> = {
  president: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  vicePresident: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  secretaryGeneral: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  directorOfSport: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10zM2 12h20"/>
    </svg>
  ),
  directorOfSocials: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
};

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
      <path d="M2 19h20v2H2v-2zM2 6l5 8 5-7 5 7 5-8v11H2V6z"/>
    </svg>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function ResultsPage() {
  const [results, setResults] = useState<Record<Position, VoteResults>>({
    president: {},
    vicePresident: {},
    secretaryGeneral: {},
    directorOfSport: {},
    directorOfSocials: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchResults() {
      try {
        const positions: Position[] = ["president", "vicePresident", "secretaryGeneral", "directorOfSport", "directorOfSocials"];
        const newResults: Record<Position, VoteResults> = {
          president: {},
          vicePresident: {},
          secretaryGeneral: {},
          directorOfSport: {},
          directorOfSocials: {},
        };
        for (const position of positions) {
          const voteDoc = await getDoc(doc(db, "votes", position));
          if (voteDoc.exists()) {
            newResults[position] = voteDoc.data() as VoteResults;
          }
        }
        setResults(newResults);
      } catch (err) {
        setError("Failed to fetch results. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, []);

  const getVoteCount = (candidateId: string, position: Position) =>
    results[position][candidateId] || 0;

  const getTotalVotes = (position: Position) =>
    Object.values(results[position]).reduce((sum, c) => sum + c, 0);

  const getPercentage = (candidateId: string, position: Position) => {
    const total = getTotalVotes(position);
    if (total === 0) return 0;
    return (getVoteCount(candidateId, position) / total) * 100;
  };

  const getWinner = (position: Position) => {
    const positionCandidates = candidates.filter((c) => c.position === position);
    if (positionCandidates.length === 0) return null;
    return positionCandidates.reduce((best, c) =>
      getVoteCount(c.id, position) > getVoteCount(best.id, position) ? c : best
    );
  };

  const grandTotal = (["president", "vicePresident", "secretaryGeneral", "directorOfSport", "directorOfSocials"] as Position[]).reduce(
    (sum, pos) => sum + getTotalVotes(pos),
    0
  );

  return (
    <main className="relative min-h-screen pb-20 overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-amber-500/[0.04] blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />

      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/50" style={{ background: 'hsl(224 45% 6% / 0.85)', backdropFilter: 'blur(20px)' }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z" stroke="hsl(224 45% 6%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">VoteNow</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse-soft" />
          Results Live
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-14">

        {/* Page header */}
        <div className="text-center mb-14 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Election Results
          </div>
          <h1 className="font-playfair text-5xl md:text-6xl font-black text-foreground mb-4">
            The People<br />
            <span className="gradient-text">Have Spoken</span>
          </h1>
          <p className="text-muted-foreground font-sans text-base max-w-md mx-auto">
            Final results from the elections. Every vote counted, every voice mattered.
          </p>
        </div>

        {/* Total votes stat */}
        {!isLoading && !error && (
          <div className="animate-slide-up delay-100 glass rounded-2xl p-6 text-center mb-10">
            <div className="stat-number">{grandTotal.toLocaleString()}</div>
            <div className="text-muted-foreground text-sm font-sans mt-1 tracking-wide">Total Votes Cast</div>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl p-7 space-y-5">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-muted-foreground font-sans">{error}</p>
          </div>
        )}

        {/* Results per position */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {(["president", "vicePresident", "secretaryGeneral", "directorOfSport", "directorOfSocials"] as Position[]).map((position, posIndex) => {
              const positionCandidates = candidates.filter((c) => c.position === position);
              const total = getTotalVotes(position);
              const winner = getWinner(position);

              return (
                <div
                  key={position}
                  className={`glass rounded-2xl overflow-hidden card-hover animate-slide-up`}
                  style={{ animationDelay: `${(posIndex + 2) * 0.12}s` }}
                >
                  {/* Position header */}
                  <div className="flex items-center justify-between px-7 py-5 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/12 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        {positionIcons[position]}
                      </div>
                      <div>
                        <h2 className="font-playfair text-xl font-bold text-foreground">
                          {positionLabels[position]}
                        </h2>
                        <p className="text-muted-foreground text-xs font-sans mt-0.5">
                          {total} vote{total !== 1 ? "s" : ""} cast
                        </p>
                      </div>
                    </div>
                    {winner && total > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-400 text-xs font-medium">
                        <CrownIcon />
                        Winner
                      </div>
                    )}
                  </div>

                  {/* Candidates */}
                  <div className="px-7 py-6 space-y-5">
                    {positionCandidates
                      .sort((a, b) => getVoteCount(b.id, position) - getVoteCount(a.id, position))
                      .map((candidate, idx) => {
                        const votes = getVoteCount(candidate.id, position);
                        const pct = getPercentage(candidate.id, position);
                        const isWinner = winner?.id === candidate.id && total > 0;

                        return (
                          <div key={candidate.id} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Rank badge */}
                                <div
                                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans ${
                                    isWinner
                                      ? "bg-amber-500 text-amber-950"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                                <span
                                  className={`text-sm font-sans font-medium truncate ${
                                    isWinner ? "text-foreground" : "text-foreground/75"
                                  }`}
                                  title={candidate.name}
                                >
                                  {candidate.name}
                                </span>
                                {isWinner && (
                                  <span className="flex-shrink-0">
                                    <CrownIcon />
                                  </span>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-3 ml-4">
                                <span className={`text-xs font-sans ${isWinner ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                                  {pct.toFixed(1)}%
                                </span>
                                <span className="text-sm font-playfair font-semibold text-foreground tabular-nums min-w-[2rem] text-right">
                                  {votes}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(224 35% 14%)' }}>
                              {mounted && (
                                <div
                                  className="h-full rounded-full progress-bar-animated transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: isWinner
                                      ? 'linear-gradient(90deg, hsl(38 92% 45%), hsl(38 95% 62%))'
                                      : 'linear-gradient(90deg, hsl(224 35% 22%), hsl(224 35% 28%))',
                                    boxShadow: isWinner ? '0 0 12px hsl(38 92% 56% / 0.4)' : 'none',
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {positionCandidates.length === 0 && (
                      <p className="text-muted-foreground text-sm font-sans text-center py-4">
                        No candidates for this position.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-14 animate-slide-up delay-600">
          <div className="divider mb-8" />
          <p className="text-muted-foreground/50 text-xs font-sans tracking-wide mb-4">
            Results are final. Thank you to all participants.
          </p>
          <Link href="/" className="btn-ghost text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

function ComingSoon() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-blue-500/[0.03] blur-[80px] pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z" stroke="hsl(224 45% 6%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">VoteNow</span>
        </Link>
      </div>

      <div className="relative z-10 text-center max-w-xl mx-auto animate-slide-up">
        <div className="flex items-center justify-center mb-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" className="text-amber-400 animate-spin-slow">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full border border-amber-500/15 scale-125 animate-pulse-soft" />
            <div className="absolute inset-0 rounded-full border border-amber-500/8 scale-150 animate-pulse-soft delay-300" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft inline-block" />
          Counting Votes
        </div>

        <h1 className="font-playfair text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Results Coming<br />
          <span className="gradient-text">Very Soon</span>
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md mx-auto font-sans">
          The election is underway. Results will be published here as soon as all votes have been counted.
        </p>

        <div className="glass rounded-2xl p-6 mb-10 text-left space-y-3">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase font-sans mb-4">Positions Being Contested</p>
          {(["President", "Vice President", "Secretary General", "Director of Sport", "Director of Socials"]).map((pos, i) => (
            <div key={pos} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${(i + 3) * 0.1}s` }}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 flex-shrink-0" />
              <span className="text-sm font-sans text-foreground/60">{pos}</span>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs font-sans text-muted-foreground/40">Pending</span>
            </div>
          ))}
        </div>

        <Link href="/" className="btn-ghost text-sm">← Back to Home</Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
    </main>
  );
}

// export default ComingSoon;
export default ResultsPage;
