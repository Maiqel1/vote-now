"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PromoVideo({ src, poster }: { src: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play()
            .then(() => setStarted(true))
            .catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  function toggleSound() {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (el.paused) el.play().then(() => setStarted(true)).catch(() => undefined);
  }

  function playManually() {
    const el = video.current;
    if (!el) return;
    el.play().then(() => setStarted(true)).catch(() => undefined);
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-16 bg-[radial-gradient(closest-side,hsl(var(--brand)/0.22),transparent)]" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-2xl shadow-black/10 md:rounded-3xl md:p-2">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted md:rounded-2xl">
          <video
            ref={video}
            className="h-full w-full object-cover"
            src={src}
            poster={poster}
            muted={muted}
            loop
            playsInline
            preload="metadata"
            controls={reducedMotion && started}
            aria-label="VoteNow product video: create an election, invite voters, vote on a phone and watch results live"
          />
          {reducedMotion && !started && (
            <button
              type="button"
              onClick={playManually}
              className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
              aria-label="Play video"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="ml-1 h-7 w-7" />
              </span>
            </button>
          )}
          {!reducedMotion && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-black/85"
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {muted ? "Sound on" : "Mute"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
