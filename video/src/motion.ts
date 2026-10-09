import type { CSSProperties } from "react";
import { Easing, interpolate, spring } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

export function tween(frame: number, range: [number, number], output: [number, number], easing = easeOut): number {
  return interpolate(frame, range, output, { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

export function pop(frame: number, start: number, fps: number, stiffness = 180, damping = 14, mass = 0.9): number {
  return spring({ frame: frame - start, fps, config: { stiffness, damping, mass } });
}

export function soft(frame: number, start: number, fps: number): number {
  return spring({ frame: frame - start, fps, config: { stiffness: 110, damping: 20, mass: 1 } });
}

export function typed(text: string, frame: number, start: number, charsPerFrame: number): string {
  const count = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  return text.slice(0, count);
}

export function count(frame: number, range: [number, number], to: number, from = 0): number {
  return Math.round(tween(frame, range, [from, to], easeInOut));
}

export function exitStyle(frame: number, duration: number, length = 8): CSSProperties {
  const t = tween(frame, [duration - length, duration], [0, 1], easeIn);
  return {
    opacity: 1 - t,
    transform: `scale(${1 - t * 0.06})`,
    filter: t > 0 ? `blur(${t * 14}px)` : undefined,
  };
}
