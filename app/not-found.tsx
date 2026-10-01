import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="absolute left-0 right-0 top-0 px-6 py-5">
        <Logo />
      </div>
      <div className="stat-number mb-4 text-7xl">404</div>
      <h1 className="mb-3 font-playfair text-3xl font-bold">Page not found</h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        This election or page doesn&apos;t exist, or it hasn&apos;t been published yet. Check the link in your invitation.
      </p>
      <Link href="/" className="btn-ghost text-sm">
        ← Home
      </Link>
    </main>
  );
}
