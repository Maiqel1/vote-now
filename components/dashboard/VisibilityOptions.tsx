"use client";

import { cn } from "@/lib/utils";
import type { ResultsVisibility } from "@/lib/types";
import { VISIBILITY_OPTIONS } from "@/lib/visibility";

export function VisibilityOptions({
  value,
  onChange,
  disabled,
}: {
  value: ResultsVisibility;
  onChange: (value: ResultsVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2" role="radiogroup">
      {VISIBILITY_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
              selected ? "border-brand/40 bg-brand-soft" : "border-border bg-muted/50 hover:bg-secondary/60",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-brand bg-brand" : "border-border",
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">{option.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
