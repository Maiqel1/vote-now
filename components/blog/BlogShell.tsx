import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { buttonVariants } from "@/components/ui/button";
import { FloatingNavbar } from "@/components/ui/floating-navbar";
import { cn } from "@/lib/utils";

export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen pb-16">
      <AuroraBackdrop intensity="soft" />
      <FloatingNavbar
        left={<Logo />}
        right={
          <>
            <Link
              href="/blog"
              className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Blog
            </Link>
            <ThemeToggle />
            <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "rounded-full")}>
              Start free
            </Link>
          </>
        }
      />
      <div className="relative mx-auto max-w-3xl px-4 pt-28 md:px-6">{children}</div>
      <footer className="mx-auto mt-20 flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground md:px-6">
        <Logo />
        <div className="flex flex-wrap gap-4">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/poll" className="hover:text-foreground">
            Free poll maker
          </Link>
          <Link href="/" className="hover:text-foreground">
            Online elections
          </Link>
        </div>
      </footer>
    </div>
  );
}
