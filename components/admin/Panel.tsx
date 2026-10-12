import Link from "next/link";
import { Notice } from "@/components/feedback/Notice";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("surface overflow-hidden rounded-2xl", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function LoadFailed({ error }: { error: string }) {
  return <Notice tone="warning">{error}</Notice>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function StatTile({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const body = (
    <div
      className={cn(
        "surface h-full rounded-2xl p-4 transition-colors",
        href && "hover:border-brand/40",
        tone === "warning" && "border-warning/30",
        tone === "danger" && "border-danger/30",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function KeyValue({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
