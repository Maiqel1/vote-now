import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");

  return (
    <div className="relative min-h-screen pb-20">
      <AuroraBackdrop intensity="soft" />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                Elections
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>
      {!user.emailVerified && (
        <div className="border-b border-warning/25 bg-warning-soft">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-warning md:px-6">
            <span>Verify your email address to send voter invitations.</span>
            <Link href="/verify-email?next=/dashboard" className="font-medium underline underline-offset-2">
              Verify now
            </Link>
          </div>
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
