import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function AuroraBackdrop({ intensity = "full", className }: { intensity?: "full" | "soft"; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background [contain:strict]", className)}
      style={{ "--white": "#fff", "--black": "#000", "--transparent": "transparent" } as CSSProperties}
    >
      <div
        className={cn(
          `pointer-events-none absolute -inset-[10px] blur-[6px] invert filter will-change-transform after:animate-aurora motion-reduce:after:animate-none sm:blur-[10px] [background-image:var(--white-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%] [--aurora:repeating-linear-gradient(100deg,var(--aurora-1)_10%,var(--aurora-2)_15%,var(--aurora-3)_20%,var(--aurora-4)_25%,var(--aurora-5)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] after:absolute after:inset-0 after:mix-blend-difference after:content-[""] after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] dark:invert-0 dark:[background-image:var(--dark-gradient),var(--aurora)] after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,
          intensity === "full"
            ? "opacity-50 [mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)] dark:opacity-40"
            : "opacity-30 [mask-image:radial-gradient(ellipse_at_100%_0%,black_5%,var(--transparent)_60%)] dark:opacity-25",
        )}
      />
    </div>
  );
}
