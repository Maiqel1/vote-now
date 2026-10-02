"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function isInternalNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function start(event: MouseEvent) {
      if (!isInternalNavigation(event)) return;
      if (timer.current) clearInterval(timer.current);
      setVisible(true);
      setProgress(12);
      timer.current = setInterval(() => setProgress((p) => (p < 85 ? p + (90 - p) * 0.08 : p)), 200);
    }
    document.addEventListener("click", start, true);
    return () => document.removeEventListener("click", start, true);
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress((p) => (p > 0 ? 100 : 0));
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className="h-full bg-brand shadow-[0_0_8px_hsl(var(--brand)/0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
