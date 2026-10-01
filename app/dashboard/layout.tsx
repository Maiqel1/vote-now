import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/dashboard");

  return (
    <div className="relative min-h-screen pb-20">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.03] blur-[80px]" />
      <header
        className="sticky top-0 z-40 border-b border-border/50"
        style={{ background: "hsl(224 45% 6% / 0.85)", backdropFilter: "blur(20px)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-sm text-foreground/70 hover:bg-secondary/60 hover:text-foreground">
                Elections
              </Link>
            </nav>
          </div>
          <UserMenu name={user.name} email={user.email} />
        </div>
      </header>
      {!user.emailVerified && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-amber-300 md:px-6">
            <span>Verify your email address to send voter invitations.</span>
            <Link href="/verify-email?next=/dashboard" className="font-medium underline underline-offset-2 hover:text-amber-200">
              Verify now
            </Link>
          </div>
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
