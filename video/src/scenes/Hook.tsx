import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeIn, easeOut, tween } from "../motion";
import { b } from "../timing";
import { MaskWords } from "../ui/Bits";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const ITEMS = [
  { word: "group chats.", icon: "chat" as const, at: 1.5 },
  { word: "paper slips.", icon: "paper" as const, at: 2.75 },
  { word: "spreadsheets.", icon: "sheet" as const, at: 4 },
];

function SlotItem({ word, icon, start, end }: { word: string; icon: "chat" | "paper" | "sheet"; start: number; end: number }) {
  const frame = useCurrentFrame();
  if (frame < start - 1 || frame > end + 10) return null;
  const enter = tween(frame, [start, start + 10], [0, 1], easeOut);
  const leave = tween(frame, [end, end + 10], [0, 1], easeIn);
  const strike = tween(frame, [start + 12, start + 20], [0, 1], easeOut);
  return (
    <div
      className="absolute inset-x-0 flex items-center justify-center gap-7"
      style={{ transform: `translateY(${(1 - enter) * 120 - leave * 120}%)`, opacity: Math.min(enter, 1 - leave) }}
    >
      <div
        className="flex h-[112px] w-[112px] items-center justify-center rounded-[30px] border border-line bg-card text-ink shadow-[0_20px_40px_-20px_rgba(9,9,11,0.35)]"
        style={{ transform: `rotate(${(1 - enter) * -14}deg)` }}
      >
        <Icon name={icon} size={56} stroke={1.8} />
      </div>
      <div className="relative">
        <span className="text-[150px] font-bold leading-none tracking-[-0.05em]" style={{ color: strike > 0.5 ? "#a1a1aa" : "#09090b" }}>
          {word}
        </span>
        <div className="absolute left-0 top-[54%] h-[14px] rounded-full bg-brand" style={{ width: `${strike * 104}%`, marginLeft: "-2%" }} />
      </div>
    </div>
  );
}

export function Hook({ duration }: SceneProps) {
  return (
    <Scene duration={duration}>
      <AbsoluteFill className="items-center justify-center">
        <div className="mb-14 text-[64px] font-semibold tracking-[-0.03em] text-ink">
          <MaskWords text="Elections shouldn't run on" start={2} stagger={3} />
        </div>
        <div className="relative h-[180px] w-full overflow-hidden">
          {ITEMS.map((item, i) => (
            <SlotItem
              key={item.word}
              word={item.word}
              icon={item.icon}
              start={b(item.at)}
              end={i < ITEMS.length - 1 ? b(ITEMS[i + 1].at) - 2 : duration + 20}
            />
          ))}
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
