import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { imageUrl } from "@/lib/image-url";
import type { Election } from "@/lib/types";

export function PublicShell({
  election,
  children,
  right,
}: {
  election: Pick<Election, "slug" | "orgName" | "logoUrl" | "accentColor">;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20">
      {election.accentColor && <div className="h-1 w-full" style={{ background: election.accentColor }} />}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.04] blur-[80px]" />
      <header
        className="sticky top-0 z-40 border-b border-border/50"
        style={{ background: "hsl(224 45% 6% / 0.85)", backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href={`/e/${election.slug}`} className="flex min-w-0 items-center gap-3">
            {election.logoUrl && (
              <img src={imageUrl(election.logoUrl, 32, "fit")} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg border border-border object-contain" />
            )}
            <span className="truncate text-sm font-medium text-foreground/85">{election.orgName}</span>
          </Link>
          {right}
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-10 md:px-6">{children}</div>
      <footer className="relative z-10 mx-auto mt-16 flex max-w-3xl items-center justify-between px-4 text-xs text-muted-foreground/60 md:px-6">
        <span>Secure voting by</span>
        <Logo />
      </footer>
    </div>
  );
}
