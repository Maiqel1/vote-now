import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { exitStyle } from "../motion";

export type SceneProps = { duration: number };

export function Scene({ children, duration, exit = true }: { children: ReactNode; duration: number; exit?: boolean }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={exit ? exitStyle(frame, duration) : undefined}>{children}</AbsoluteFill>;
}
