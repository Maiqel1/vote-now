"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { savedPolls, type SavedPoll } from "@/lib/client/poll-storage";
import { timeAgo } from "@/lib/format";

export function RecentPolls() {
  const [polls, setPolls] = useState<SavedPoll[]>([]);

  useEffect(() => {
    setPolls(savedPolls());
  }, []);

  if (polls.length === 0) return null;

  return (
    <div className="surface rounded-2xl p-5 text-left md:p-6">
      <div className="mb-3 text-sm font-semibold text-foreground">Polls you created on this device</div>
      <ul className="divide-y divide-border/50">
        {polls.map((poll) => (
          <li key={poll.code}>
            <Link
              href={`/p/${poll.code}/manage#${poll.key}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-brand-strong"
            >
              <span className="min-w-0 truncate text-foreground/90">{poll.title}</span>
              <span className="flex-shrink-0 text-xs text-muted-foreground">{timeAgo(poll.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
