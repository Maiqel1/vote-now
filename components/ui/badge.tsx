import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-muted-foreground",
        amber: "border-amber-500/25 bg-amber-500/10 text-amber-400",
        green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        blue: "border-blue-500/25 bg-blue-500/10 text-blue-400",
        red: "border-red-500/25 bg-red-500/10 text-red-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
