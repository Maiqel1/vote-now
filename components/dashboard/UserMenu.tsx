"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutEverywhere } from "@/lib/client/session";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = (name || email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    await signOutEverywhere();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initials || "?"}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 animate-slide-up-sm rounded-xl border border-border bg-card p-2 shadow-2xl">
          <div className="border-b border-border/60 px-3 py-2">
            <div className="truncate text-sm font-medium text-foreground">{name || "Your account"}</div>
            <div className="truncate text-xs text-muted-foreground">{email}</div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-secondary"
          >
            My elections
          </Link>
          <Link
            href="/dashboard/account"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-secondary"
          >
            Account
          </Link>
          <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
