import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { imageUrl } from "@/lib/image-url";
import type { Election } from "@/lib/types";

export function PublicShell({
  election,
  children,
  right,
  intensity = "full",
}: {
  election: Pick<Election, "slug" | "orgName" | "logoUrl" | "accentColor">;
  children: React.ReactNode;
  right?: React.ReactNode;
  intensity?: "full" | "soft";
}) {
  return (
    <div className="relative min-h-screen pb-16">
      <AuroraBackdrop intensity={intensity} />
      <FloatingNavbar
        left={
          <Link href={`/e/${election.slug}`} className="flex min-w-0 items-center gap-2.5">
            {election.logoUrl ? (
              <img
                src={imageUrl(election.logoUrl, 28, "fit")}
                alt=""
                className="h-7 w-7 flex-shrink-0 rounded-md border border-border bg-background object-contain"
              />
            ) : (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand"
                style={election.accentColor ? { background: election.accentColor } : undefined}
              />
            )}
            <span className="truncate text-sm font-medium text-foreground">{election.orgName}</span>
          </Link>
        }
        right={
          <>
            {right}
            <ThemeToggle />
          </>
        }
      />
      <div className="relative mx-auto max-w-3xl px-4 pt-28 md:px-6">{children}</div>
      <footer className="mx-auto mt-16 flex max-w-3xl items-center justify-between px-4 text-xs text-muted-foreground md:px-6">
        <span>Secure voting by</span>
        <Logo />
      </footer>
    </div>
  );
}
