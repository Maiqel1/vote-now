import { getEffectiveStatus } from "./election-status";
import type { EffectiveStatus, Election } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayCount {
  day: string;
  count: number;
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function lastNDays(days: number, now = Date.now()): string[] {
  return Array.from({ length: days }, (_, i) => dayKey(now - (days - 1 - i) * DAY_MS));
}

export function bucketByDay(times: number[], days: number, now = Date.now()): DayCount[] {
  const keys = lastNDays(days, now);
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const time of times) {
    const key = dayKey(time);
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  }
  return keys.map((day) => ({ day, count: counts.get(day)! }));
}

export function countSince(times: number[], since: number): number {
  return times.filter((time) => time >= since).length;
}

export function statusBreakdown(
  elections: Pick<Election, "status" | "paused" | "startsAt" | "endsAt">[],
  now = Date.now(),
): Record<EffectiveStatus, number> {
  const result: Record<EffectiveStatus, number> = { draft: 0, scheduled: 0, open: 0, paused: 0, closed: 0 };
  for (const election of elections) result[getEffectiveStatus(election, now)] += 1;
  return result;
}

export function turnoutPercent(voted: number, voters: number): number {
  return voters > 0 ? Math.round((voted / voters) * 100) : 0;
}

export function average(values: number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
