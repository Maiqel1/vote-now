"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function Countdown({ target, label }: { target: number; label: string }) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target) {
        clearInterval(id);
        setTimeout(() => router.refresh(), 1500);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, router]);

  if (now === null) return <div className="h-[76px]" />;
  const p = parts(target - now);
  const units: [string, number][] = [
    ["days", p.days],
    ["hrs", p.hours],
    ["min", p.minutes],
    ["sec", p.seconds],
  ];

  return (
    <div className="text-center">
      <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex justify-center gap-3">
        {units.map(([unit, value]) => (
          <div key={unit} className="glass w-16 rounded-xl py-2.5">
            <div className="font-playfair text-2xl font-bold tabular-nums text-foreground">{String(value).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
