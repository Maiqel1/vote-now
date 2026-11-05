"use client";

import { useCallback, useEffect, useState } from "react";
import type { PollResultsPayload } from "@/lib/polls";

const REFRESH_MS = 3000;

export function usePollResults(code: string, initial: PollResultsPayload | null, live: boolean) {
  const [results, setResults] = useState<PollResultsPayload | null>(initial);
  const [removed, setRemoved] = useState(false);

  const refresh = useCallback(
    async (fresh = false) => {
      try {
        const res = await fetch(`/api/p/${code}/results${fresh ? `?fresh=${Date.now()}` : ""}`, { cache: "no-store" });
        if (res.status === 410) {
          setRemoved(true);
          return;
        }
        if (!res.ok) return;
        const next = (await res.json()) as PollResultsPayload;
        setResults((prev) =>
          !prev || next.status !== prev.status || next.hidden !== prev.hidden || next.total >= prev.total ? next : prev,
        );
      } catch {}
    },
    [code],
  );

  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [live, refresh]);

  return { results, removed, refresh };
}
