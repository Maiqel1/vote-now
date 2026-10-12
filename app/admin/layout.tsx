import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireSuperadminPage } from "@/lib/auth/superadmin";
import { environmentInfo } from "@/lib/server/admin/system";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · VoteNow" },
  robots: { index: false, follow: false },
};

const ENV_BADGE = { production: "amber", preview: "blue" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperadminPage();
  const env = environmentInfo();

  return (
    <div className="relative min-h-screen pb-20">
      <AuroraBackdrop intensity="soft" />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/admin" />
            <span className="hidden text-sm text-muted-foreground sm:inline">Admin console</span>
            <Badge variant={ENV_BADGE[env.environment as keyof typeof ENV_BADGE] ?? "default"}>{env.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground md:inline">{admin.email}</span>
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              My elections
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-6 md:px-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:pt-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <AdminNav />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
