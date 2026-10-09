import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, tween } from "../motion";
import { b } from "../timing";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const LINES = [
  { text: "Secret ballot.", icon: "lock" as const, beat: 0 },
  { text: "One vote each.", icon: "key" as const, beat: 1.5 },
  { text: "Every action logged.", icon: "scroll" as const, beat: 3 },
];

export function Trust({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const allLit = frame >= b(4.5);

  return (
    <Scene duration={duration}>
      <AbsoluteFill className="justify-center pl-[260px]">
        {LINES.map((line, i) => {
          const start = b(line.beat);
          const s = pop(frame, start, fps, 260, 15, 0.8);
          const next = LINES[i + 1] ? b(LINES[i + 1].beat) : Infinity;
          const dim = allLit || !Number.isFinite(next) ? 0 : tween(frame, [next, next + 8], [0, 1]);
          if (frame < start) return <div key={line.text} className="h-[176px]" />;
          return (
            <div
              key={line.text}
              className="flex h-[176px] items-center gap-10"
              style={{
                opacity: Math.min(1, s * 1.6) * (1 - dim * 0.65),
                transform: `scale(${1 + (1 - s) * 0.45}) translateY(${(1 - s) * -30}px)`,
                transformOrigin: "left center",
                filter: s < 0.98 ? `blur(${(1 - s) * 14}px)` : undefined,
              }}
            >
              <div
                className="flex h-[120px] w-[120px] items-center justify-center rounded-[34px] border border-brand-line bg-brand-soft text-brand"
                style={{ transform: `rotate(${(1 - s) * 30}deg)` }}
              >
                <Icon name={line.icon} size={60} stroke={1.9} />
              </div>
              <span className="text-[124px] font-bold leading-none tracking-[-0.05em] text-ink">{line.text}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Scene>
  );
}
