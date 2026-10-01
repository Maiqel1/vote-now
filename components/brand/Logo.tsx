import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500", className)}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z"
          stroke="hsl(224 45% 6%)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <LogoMark />
      <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 transition-colors group-hover:text-foreground">
        VoteNow
      </span>
    </Link>
  );
}
