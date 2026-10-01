import { cn } from "@/lib/utils";
import { GlowCard } from "./glow-card";

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 md:grid-cols-3", className)}>{children}</div>;
}

export function BentoItem({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <GlowCard className={className} innerClassName="flex flex-col justify-between gap-6 p-6">
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand-soft text-brand-strong">{icon}</div>
      )}
      <div>
        <h3 className="mb-1.5 text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </GlowCard>
  );
}
