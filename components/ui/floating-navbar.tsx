"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FloatingNavbar({ left, right, className }: { left: React.ReactNode; right?: React.ReactNode; className?: string }) {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    setVisible(current < 80 || current < previous);
  });

  return (
    <motion.nav
      initial={false}
      animate={{ y: visible ? 0 : -96, opacity: visible ? 1 : 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-4xl items-center justify-between gap-3 rounded-full border border-border/70 bg-background/70 py-2 pl-4 pr-2 shadow-lg shadow-black/[0.04] backdrop-blur-xl dark:shadow-black/40",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">{left}</div>
      {right && <div className="flex flex-shrink-0 items-center gap-1.5">{right}</div>}
    </motion.nav>
  );
}
