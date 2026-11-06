import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-12 text-2xl font-semibold tracking-tight text-foreground">{children}</h2>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-8 text-lg font-semibold text-foreground">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[15px] leading-7 text-foreground/85">{children}</p>;
}

export function List({ children, ordered }: { children: React.ReactNode; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("mb-5 space-y-2 pl-5 text-[15px] leading-7 text-foreground/85", ordered ? "list-decimal" : "list-disc")}>
      {children}
    </Tag>
  );
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function Quote({ children, cite }: { children: React.ReactNode; cite: string }) {
  return (
    <figure className="my-8 rounded-2xl border-l-4 border-brand bg-brand-soft/60 px-6 py-5">
      <blockquote className="text-lg font-medium leading-relaxed text-foreground">{children}</blockquote>
      <figcaption className="mt-3 text-sm text-muted-foreground">{cite}</figcaption>
    </figure>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="surface rounded-2xl p-4">
          <div className="text-2xl font-bold tabular-nums text-foreground">{item.value}</div>
          <div className="mt-1 text-xs leading-snug text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface my-8 rounded-2xl p-5">
      <div className="mb-2 text-sm font-semibold text-foreground">{title}</div>
      <div className="text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-brand-strong underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function ArticleCta() {
  return (
    <div className="surface mt-14 rounded-2xl p-6 text-center md:p-8">
      <h2 className="mb-2 text-2xl font-semibold text-foreground">Run your next election on VoteNow</h2>
      <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
        Secret ballots, one vote per voter and live turnout. Start free, no credit card.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/signup" className={buttonVariants({ variant: "shimmer", size: "lg" })}>
          Create an election
        </Link>
        <Link href="/poll" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Or make a quick poll
        </Link>
      </div>
    </div>
  );
}
