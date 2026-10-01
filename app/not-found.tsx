import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuroraBackdrop } from "@/components/ui/aurora-background";
import { buttonVariants } from "@/components/ui/button";
import { FloatingNavbar } from "@/components/ui/floating-navbar";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AuroraBackdrop />
      <FloatingNavbar left={<Logo />} right={<ThemeToggle />} />
      <div className="mb-4 bg-gradient-to-b from-foreground to-brand bg-clip-text text-8xl font-bold tracking-tighter text-transparent">404</div>
      <h1 className="mb-3 text-3xl font-semibold">Page not found</h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        This election or page doesn&apos;t exist, or it hasn&apos;t been published yet. Check the link in your invitation.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        ← Home
      </Link>
    </main>
  );
}
