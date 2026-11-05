import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PlatformBanner } from "@/components/PlatformBanner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { buttonVariants } from "@/components/ui/button";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { cn } from "@/lib/utils";

export function PollShell({
  children,
  width = "narrow",
  showNewPoll = true,
}: {
  children: React.ReactNode;
  width?: "narrow" | "wide";
  showNewPoll?: boolean;
}) {
  return (
    <div className="relative min-h-screen pb-16">
      <AuroraBackdrop intensity="soft" />
      <FloatingNavbar
        left={<Logo />}
        right={
          <>
            <ThemeToggle />
            {showNewPoll && (
              <Link href="/poll" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
                New poll
              </Link>
            )}
          </>
        }
      />
      <div className={cn("relative mx-auto px-4 pt-28 md:px-6", width === "wide" ? "max-w-3xl" : "max-w-2xl")}>
        <PlatformBanner variant="card" />
        {children}
      </div>
      <footer className="mx-auto mt-16 flex max-w-2xl items-center justify-between px-4 text-xs text-muted-foreground md:px-6">
        <span>Instant polls by</span>
        <Logo />
      </footer>
    </div>
  );
}
