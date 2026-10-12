"use client";

import { useState } from "react";
import type { DayCount } from "@/lib/admin-metrics";
import { compactNumber } from "@/lib/format";

function dayLabel(day: string, long = false): string {
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" }).format(date);
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= value / 4) ?? magnitude * 10;
  return Math.ceil(value / step) * step;
}

export function BarChart({ data, unit, height = 140 }: { data: DayCount[]; unit: [string, string]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(0, ...data.map((d) => d.count));
  const max = niceMax(peak);
  const peakIndex = peak > 0 ? data.findIndex((d) => d.count === peak) : -1;
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const label = (count: number) => `${count.toLocaleString()} ${count === 1 ? unit[0] : unit[1]}`;

  return (
    <figure className="w-full">
      <div className="flex gap-2">
        <div className="flex w-8 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground" style={{ height }}>
          <span className="-translate-y-1/2">{compactNumber(max)}</span>
          <span>{compactNumber(max / 2)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-border/60" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-border/40" />
          <div
            className="relative flex items-end border-b border-border"
            style={{ height }}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label={`${label(total)} over ${data.length} days, peak ${label(peak)}`}
          >
            {data.map((d, i) => {
              const pct = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div
                  key={d.day}
                  className="relative flex h-full flex-1 items-end justify-center px-px"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={-1}
                >
                  {i === peakIndex && hover === null && (
                    <span
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-medium tabular-nums text-foreground"
                      style={{ bottom: `calc(${pct}% + 4px)` }}
                    >
                      {compactNumber(d.count)}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${hover === i ? "bg-brand-strong" : "bg-brand"}`}
                    style={{ height: d.count > 0 ? `max(${pct}%, 2px)` : 0 }}
                  />
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
                      <div className="text-muted-foreground">{dayLabel(d.day, true)}</div>
                      <div className="font-medium tabular-nums text-foreground">{label(d.count)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{dayLabel(data[0]?.day ?? "")}</span>
            <span>{dayLabel(data[data.length - 1]?.day ?? "")}</span>
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Daily {unit[1]}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
