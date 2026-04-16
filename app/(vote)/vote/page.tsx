"use client";

import React, { useState } from "react";
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

type Position =
  | "president"
  | "vicePresident"
  | "secretaryGeneral"
  | "directorOfSport"
  | "directorOfSocials";

interface Candidate {
  id: string;
  name: string;
  position: Position;
}

interface Votes {
  president: string;
  vicePresident: string;
  secretaryGeneral: string;
  directorOfSport: string;
  directorOfSocials: string;
}

const candidates: Candidate[] = [
  { id: "1", name: "Alhassan Usman Adam", position: "president" },
  { id: "2", name: "Ohuoba Nosamudiana David", position: "president" },
  { id: "3", name: "Ikejiaku Miracle", position: "vicePresident" },
  { id: "4", name: "Bello Alimat Ayomide", position: "secretaryGeneral" },
  { id: "5", name: "Akintan Ayomide", position: "directorOfSport" },
  {
    id: "6",
    name: "Oladipupo Demilade Christiana",
    position: "directorOfSocials",
  },
];

const positionLabels: Record<Position, string> = {
  president: "President",
  vicePresident: "Vice President",
  secretaryGeneral: "Secretary General",
  directorOfSport: "Director of Sport",
  directorOfSocials: "Director of Socials",
};

const positions: Position[] = [
  "president",
  "vicePresident",
  "secretaryGeneral",
  "directorOfSport",
  "directorOfSocials",
];

function NavBar() {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z"
              stroke="hsl(224 45% 6%)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">
          VoteNow
        </span>
      </Link>
      <Link
        href="/results"
        className="text-xs text-muted-foreground hover:text-amber-400 transition-colors tracking-wide"
      >
        View Results →
      </Link>
    </div>
  );
}

function VotingApp() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [votes, setVotes] = useState<Votes>({
    president: "",
    vicePresident: "",
    secretaryGeneral: "",
    directorOfSport: "",
    directorOfSocials: "",
  });
  const [userName, setUserName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleVoteChange = (position: Position, value: string) => {
    setVotes((prev) => ({ ...prev, [position]: value }));
  };

  const verifyVoter = async () => {
    setIsLoading(true);
    setError("");

    try {
      const voterDoc = await getDoc(doc(db, "voters", email));

      if (!voterDoc.exists()) {
        setError("Voter not found. Please check your email address.");
        return;
      }

      const voterData = voterDoc.data();

      if (voterData.hasVoted) {
        setError("You have already cast your vote.");
        return;
      }

      if (voterData.code !== code) {
        setError(
          "Invalid voting code. Please check the code sent to your email.",
        );
        return;
      }

      setUserName(`${voterData.firstName} ${voterData.lastName}`);
      setIsVerified(true);
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const submitVote = async () => {
    const allVoted = positions.every((p) => votes[p]);
    if (!allVoted) {
      setError("Please vote for all positions before submitting.");
      return;
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to submit your vote? This cannot be undone.",
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setError("");

    try {
      const voterRef = doc(db, "voters", email);

      await updateDoc(voterRef, {
        hasVoted: true,
        votedAt: new Date().toISOString(),
        votes,
      });

      for (const [position, candidateId] of Object.entries(votes)) {
        const voteRef = doc(db, "votes", position);
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
          await updateDoc(voteRef, { [`${candidateId}`]: increment(1) });
        } else {
          await setDoc(voteRef, { [`${candidateId}`]: 1 });
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit vote. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[100px] pointer-events-none" />
        <NavBar />
        <div className="relative z-10 text-center max-w-md mx-auto animate-slide-up">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-emerald-400"
              >
                <path
                  d="M9 12L11 14L15 10M21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">
            Vote Submitted!
          </h1>
          <p className="text-muted-foreground font-sans leading-relaxed mb-8">
            Thank you, {userName}. Your vote has been recorded.
          </p>
          <Link href="/results" className="btn-primary text-sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            View Results
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
      </main>
    );
  }

  // Verify step
  if (!isVerified) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[80px] pointer-events-none" />
        <NavBar />

        <div className="relative z-10 w-full max-w-md animate-slide-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft inline-block" />
              Polls Open
            </div>
            <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">
              Verify to Vote
            </h1>
            <p className="text-muted-foreground font-sans text-sm">
              Enter your email and the voting code sent to your inbox.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-muted-foreground/50">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Voting Code
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-muted-foreground/50">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter your code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans font-mono tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-red-400 font-sans">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button
              onClick={verifyVoter}
              disabled={isLoading || !email || !code}
              className="w-full btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  Verify Identity
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
      </main>
    );
  }

  // Voting form
  return (
    <main className="relative min-h-screen pb-20 overflow-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[80px] pointer-events-none" />

      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 border-b border-border/50"
        style={{
          background: "hsl(224 45% 6% / 0.85)",
          backdropFilter: "blur(20px)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z"
                stroke="hsl(224 45% 6%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80">
            VoteNow
          </span>
        </Link>
        <div className="text-xs text-muted-foreground font-sans">
          Voting as{" "}
          <span className="text-amber-400 font-medium">{userName}</span>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-10">
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft inline-block" />
            Cast Your Vote
          </div>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-2">
            Welcome, {userName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground font-sans text-sm">
            Select one candidate per position. You cannot change your vote after
            submitting.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 animate-slide-up delay-100">
          {positions.map((pos, i) => (
            <div
              key={pos}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <div
                className={`h-1 w-full rounded-full transition-all duration-300 ${votes[pos] ? "bg-amber-500" : "bg-secondary"}`}
              />
              <span className="text-[10px] text-muted-foreground/50 font-sans hidden sm:block truncate w-full text-center">
                {positionLabels[pos].split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Position cards */}
        <div className="space-y-5">
          {positions.map((position, posIndex) => (
            <div
              key={position}
              className="glass rounded-2xl overflow-hidden animate-slide-up"
              style={{ animationDelay: `${(posIndex + 2) * 0.1}s` }}
            >
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                <h2 className="font-playfair text-lg font-bold text-foreground">
                  {positionLabels[position]}
                </h2>
                {votes[position] && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-sans">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Selected
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                {candidates
                  .filter((c) => c.position === position)
                  .map((candidate) => {
                    const isSelected = votes[position] === candidate.id;
                    return (
                      <label
                        key={candidate.id}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-amber-500/12 border border-amber-500/30"
                            : "bg-secondary/40 border border-transparent hover:border-border hover:bg-secondary/70"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-amber-950" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name={position}
                          value={candidate.id}
                          checked={isSelected}
                          onChange={() =>
                            handleVoteChange(position, candidate.id)
                          }
                          className="sr-only"
                        />
                        <span
                          className={`font-sans text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground/70"}`}
                        >
                          {candidate.name}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-red-400 font-sans mt-5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 animate-slide-up delay-700">
          <button
            onClick={submitVote}
            disabled={isLoading || !positions.every((p) => votes[p])}
            className="w-full btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-sm"
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Submit My Vote
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
          <p className="text-center text-muted-foreground/40 text-xs font-sans mt-3">
            {positions.filter((p) => votes[p]).length} of {positions.length}{" "}
            positions selected
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
    </main>
  );
}

// Switch between VotingApp and the closed notice here
// export default function VotingPage() {
//   return (
//     <main className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
//       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[100px] pointer-events-none" />
//       <NavBar />

//       <div className="relative z-10 text-center max-w-xl mx-auto animate-slide-up">
//         <div className="flex items-center justify-center mb-10">
//           <div className="relative">
//             <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-glow-pulse">
//               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-amber-400">
//                 <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5"/>
//                 <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
//               </svg>
//             </div>
//             <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-xl -z-10" />
//           </div>
//         </div>

//         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-6">
//           <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
//           Polls Closed
//         </div>

//         <h1 className="font-playfair text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
//           Voting is<br />
//           <span className="gradient-text">Now Over</span>
//         </h1>

//         <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md mx-auto font-sans">
//           The polls have closed. Thank you to everyone who participated — your voice was heard.
//           Results are now available.
//         </p>

//         <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
//           <Link href="/results" className="btn-primary text-sm tracking-wide">
//             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M18 20V10M12 20V4M6 20v-6"/>
//             </svg>
//             View Election Results
//           </Link>
//           <Link href="/" className="btn-ghost text-sm">← Back Home</Link>
//         </div>
//       </div>

//       <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
//     </main>
//   );
// }

// To re-open voting, replace the export above with:
export default VotingApp;
