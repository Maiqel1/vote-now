import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/election-status";
import type { EffectiveStatus } from "@/lib/types";

const VARIANTS = {
  draft: "default",
  scheduled: "blue",
  open: "green",
  paused: "amber",
  closed: "default",
} as const;

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <Badge variant={VARIANTS[status]}>
      {status === "open" && <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-400" />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
