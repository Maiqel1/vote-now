import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, pop, tween } from "../motion";
import { MaskWords } from "../ui/Bits";
import { Scene, type SceneProps } from "../ui/Scene";

const SHIELD =
  "M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z";

export function Brand({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = pop(frame, 0, fps, 160, 13);
  const draw = tween(frame, [4, 24], [0, 1], easeOut);
  const word = tween(frame, [8, 22], [0, 1], easeOut);
  const zoomOut = tween(frame, [duration - 10, duration], [0, 1]);

  return (
    <Scene duration={duration} exit={false}>
      <AbsoluteFill
        className="items-center justify-center"
        style={{ transform: `scale(${1 + zoomOut * 0.35})`, opacity: 1 - zoomOut, filter: zoomOut > 0 ? `blur(${zoomOut * 10}px)` : undefined }}
      >
        <div className="flex items-center gap-10">
          <div
            className="flex h-[176px] w-[176px] items-center justify-center rounded-[46px] bg-ink"
            style={{
              transform: `scale(${0.4 + mark * 0.6}) rotate(${(1 - mark) * -18}deg)`,
              boxShadow: `0 40px 80px -30px rgba(234,88,12,${0.55 * mark})`,
            }}
          >
            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={SHIELD} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            </svg>
          </div>
          <div className="overflow-hidden pb-4">
            <div
              className="text-[176px] font-bold leading-none tracking-[-0.06em] text-ink"
              style={{ transform: `translateX(${(1 - word) * -40}%)`, clipPath: `inset(0 ${(1 - word) * 100}% 0 0)` }}
            >
              Vote<span className="text-brand">Now</span>
            </div>
          </div>
        </div>
        <div className="mt-12 text-[60px] font-medium tracking-[-0.03em] text-muted">
          <MaskWords text="Run an election people actually trust." start={20} stagger={2} highlight={["trust"]} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
