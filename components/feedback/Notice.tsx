import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info" | "warning";

const TONES: Record<Tone, string> = {
  error: "bg-danger-soft border-danger/25 text-danger",
  success: "bg-success-soft border-success/25 text-success",
  info: "bg-info-soft border-info/25 text-info",
  warning: "bg-warning-soft border-warning/25 text-warning",
};

function Icon({ tone }: { tone: Tone }) {
  if (tone === "success") {
    return <polyline points="20 6 9 17 4 12" />;
  }
  return (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  );
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", TONES[tone], className)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 flex-shrink-0"
      >
        <Icon tone={tone} />
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
