import scenes from "./scenes.json";
import timing from "./timing.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BEAT = (60 / timing.bpm) * FPS;
export const OFFSET = timing.offsetFrames;

export const b = (beats: number) => Math.round(beats * BEAT);

export const SCENE_BEATS = scenes;

export type SceneName = keyof typeof SCENE_BEATS;

export function sceneStarts(): Record<SceneName, { from: number; duration: number }> {
  let cursor = 0;
  const result = {} as Record<SceneName, { from: number; duration: number }>;
  for (const [name, beats] of Object.entries(SCENE_BEATS) as [SceneName, number][]) {
    const from = name === "hook" ? 0 : OFFSET + b(cursor);
    const end = OFFSET + b(cursor + beats);
    result[name] = { from, duration: end - from };
    cursor += beats;
  }
  return result;
}

export const TOTAL_FRAMES = OFFSET + b(Object.values(SCENE_BEATS).reduce((a, n) => a + n, 0));
