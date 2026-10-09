"use client";

import { useEffect } from "react";

export function ScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;

    const onScroll = () => {
      if (timer === undefined) root.dataset.scrolling = "";
      else window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete root.dataset.scrolling;
        timer = undefined;
      }, 250);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.clearTimeout(timer);
      delete root.dataset.scrolling;
    };
  }, []);

  return null;
}
