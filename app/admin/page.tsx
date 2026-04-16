"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const votersRef = collection(db, "voters");
      const [allVotersSnapshot, pendingEmailsSnapshot] = await Promise.all([
        getDocs(query(votersRef)),
        getDocs(query(votersRef, where("emailSent", "==", false))),
      ]);
      setStats({
        total: allVotersSnapshot.size,
        pending: pendingEmailsSnapshot.size,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const sendEmails = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/send-voter-emails", {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 207) {
        setSuccess(
          `Partially successful: Sent ${data.sentCount} emails. ${data.errorCount} failed.`,
        );
        setError(`Errors: ${data.errors.join("; ")}`);
      } else if (response.ok) {
        setSuccess(`Successfully sent ${data.sentCount} emails`);
      } else {
        throw new Error(data.error || "Failed to send emails");
      }

      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const clearVoters = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL voters? This cannot be undone.",
      )
    )
      return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const votersRef = collection(db, "voters");
      const snapshot = await getDocs(votersRef);
      await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
      setSuccess(`Successfully deleted ${snapshot.size} voters`);
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete voters");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen pb-20 overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[80px] pointer-events-none" />

      {/* Top bar */}
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
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">
            VoteNow
          </span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-medium tracking-wide font-sans">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Admin
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-12">
        {/* Header */}
        <div className="mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Control Panel
          </div>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground font-sans text-sm">
            Manage voter registrations and election operations.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up delay-100">
          <div className="glass rounded-2xl p-6 card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/12 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
            </div>
            {statsLoading ? (
              <div className="skeleton h-10 w-16 mb-1" />
            ) : (
              <div className="stat-number text-4xl">{stats.total}</div>
            )}
            <div className="text-muted-foreground text-xs font-sans mt-1 tracking-wide">
              Total Registered
            </div>
          </div>

          <div className="glass rounded-2xl p-6 card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/12 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            {statsLoading ? (
              <div className="skeleton h-10 w-12 mb-1" />
            ) : (
              <div
                className="font-playfair text-4xl font-bold leading-none"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(220 90% 75%), hsl(220 80% 58%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stats.pending}
              </div>
            )}
            <div className="text-muted-foreground text-xs font-sans mt-1 tracking-wide">
              Pending Emails
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="glass rounded-2xl p-7 space-y-4 animate-slide-up delay-200">
          <h2 className="font-playfair text-lg font-semibold text-foreground mb-5">
            Actions
          </h2>

          {/* Send emails button */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/60 border border-border">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground/80 font-sans">
                Send Voter Codes
              </div>
              <div className="text-xs text-muted-foreground font-sans mt-0.5">
                Dispatch voting codes to all pending registrations
              </div>
            </div>
            <button
              onClick={sendEmails}
              disabled
              className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400/50 text-xs font-medium font-sans cursor-not-allowed border border-amber-500/15"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Disabled
            </button>
          </div>

          {/* Refresh stats */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/60 border border-border">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground/80 font-sans">
                Refresh Stats
              </div>
              <div className="text-xs text-muted-foreground font-sans mt-0.5">
                Pull the latest voter counts from the database
              </div>
            </div>
            <button
              onClick={fetchStats}
              disabled={statsLoading || isLoading}
              className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-semibold font-sans transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={statsLoading ? "animate-spin" : ""}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Clear all voters */}
          {/* <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="min-w-0">
              <div className="text-sm font-medium text-red-400 font-sans">
                Clear All Voters
              </div>
              <div className="text-xs text-muted-foreground font-sans mt-0.5">
                Permanently delete all voter registrations — cannot be undone
              </div>
            </div>
            <button
              onClick={clearVoters}
              disabled={isLoading || stats.total === 0}
              className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold font-sans transition-all border border-red-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Clear
            </button>
          </div> */}

          {/* View results */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/60 border border-border">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground/80 font-sans">
                Election Results
              </div>
              <div className="text-xs text-muted-foreground font-sans mt-0.5">
                View the live results dashboard
              </div>
            </div>
            <Link
              href="/results"
              className="flex-shrink-0 ml-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground/75 hover:text-foreground text-xs font-medium font-sans transition-all"
            >
              View
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Notifications */}
        {(error || success) && (
          <div className="mt-5 space-y-3 animate-slide-up-sm">
            {success && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-sans">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {success}
              </div>
            )}
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
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
    </main>
  );
}
