"use client";

import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { sumShards } from "@/lib/results";
import type { TallyShard } from "@/lib/types";

export function useLiveTally(electionId: string, initial: TallyShard, options: { enabled: boolean; requireAuth: boolean }) {
  const [tally, setTally] = useState<TallyShard>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setTally(initial);
  }, [initial]);

  useEffect(() => {
    if (!options.enabled) return;
    let unsubscribeSnapshot: (() => void) | null = null;

    function subscribe() {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = onSnapshot(
        collection(db, "elections", electionId, "tallies"),
        (snap) => {
          setTally(sumShards(snap.docs.map((d) => d.data() as TallyShard)));
          setLive(true);
        },
        () => setLive(false),
      );
    }

    if (!options.requireAuth) {
      subscribe();
      return () => unsubscribeSnapshot?.();
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) subscribe();
      else {
        unsubscribeSnapshot?.();
        setLive(false);
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot?.();
    };
  }, [electionId, options.enabled, options.requireAuth]);

  return { tally, live };
}
