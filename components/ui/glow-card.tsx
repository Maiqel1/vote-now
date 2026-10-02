"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function GlowCard({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function track(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={track}
      className={cn(
        "group relative rounded-2xl p-px shadow-sm transition-shadow [--o:0] [background:radial-gradient(260px_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--brand)/calc(var(--o)*0.7)),transparent_45%),hsl(var(--border))] hover:shadow-md hover:[--o:1]",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full rounded-[15px] bg-card/95 [background-image:radial-gradient(420px_circle_at_var(--x,50%)_var(--y,50%),hsl(var(--brand)/calc(var(--o)*0.06)),transparent_50%)]",
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
