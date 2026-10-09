import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, tween } from "../motion";
import { MaskWords } from "../ui/Bits";
import { Icon } from "../ui/Icon";
import type { SceneProps } from "../ui/Scene";

export function Cta({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = pop(frame, 0, fps, 170, 13);
  const word = tween(frame, [6, 20], [0, 1]);
  const url = pop(frame, 30, fps, 190, 14);
  const glow = 0.4 + Math.sin(frame / 8) * 0.15;
  const settle = tween(frame, [0, duration], [1.04, 1]);

  return (
    <AbsoluteFill className="items-center justify-center" style={{ transform: `scale(${settle})` }}>
      <div className="flex items-center gap-8">
        <div
          className="flex h-[132px] w-[132px] items-center justify-center rounded-[36px] bg-ink text-white"
          style={{ transform: `scale(${0.5 + mark * 0.5}) rotate(${(1 - mark) * -14}deg)`, boxShadow: `0 30px 70px -24px rgba(234,88,12,${glow})` }}
        >
          <Icon name="shield" size={70} stroke={2} />
        </div>
        <div className="overflow-hidden pb-3">
          <div className="text-[132px] font-bold leading-none tracking-[-0.06em] text-ink" style={{ clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}>
            Vote<span className="text-brand">Now</span>
          </div>
        </div>
      </div>
      <div className="mt-12 text-[76px] font-bold tracking-[-0.045em] text-ink">
        <MaskWords text="Start free. No credit card." start={14} stagger={3} highlight={["free"]} />
      </div>
      <div
        className="mt-12 flex items-center gap-3 rounded-full border-2 border-brand bg-card px-9 py-4 text-[40px] font-semibold tracking-tight text-ink"
        style={{ opacity: url, transform: `scale(${0.7 + url * 0.3})`, boxShadow: "0 24px 50px -24px rgba(234,88,12,0.6)" }}
      >
        vote-now.xyz
        <span className="text-brand">
          <Icon name="arrow" size={36} stroke={2.6} />
        </span>
      </div>
    </AbsoluteFill>
  );
}
