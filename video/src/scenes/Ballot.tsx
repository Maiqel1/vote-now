import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, soft, tween } from "../motion";
import { Avatar, Caption, Cursor } from "../ui/Bits";
import { AppHeader, BrowserFrame } from "../ui/Frames";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const POSITIONS = [
  { title: "President", hint: "Choose one", candidates: ["Ada Okafor", "Tunde Bello", "Grace Mensah"], yesno: false },
  { title: "Vice President", hint: "Yes / No", candidates: ["Kemi Adeyemi"], yesno: true },
  { title: "Treasurer", hint: "Choose one", candidates: ["David Eze", "Nkechi Obi"], yesno: false },
];

export function Ballot({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = soft(frame, 2, fps);
  const push = tween(frame, [0, duration], [0, 0.05]);
  const saved = frame >= 132;
  const savedPop = pop(frame, 132, fps, 200, 12);
  let avatarIndex = 0;

  return (
    <Scene duration={duration}>
      <AbsoluteFill style={{ transform: `scale(${1 + push})` }}>
        <div className="absolute left-[110px] top-[150px]" style={{ perspective: 2400 }}>
          <div
            style={{
              transform: `translateX(${(1 - enter) * -520}px) rotateY(${34 - enter * 22}deg) rotateX(${8 - enter * 3}deg)`,
              opacity: enter,
              transformOrigin: "right center",
            }}
          >
            <BrowserFrame url="vote-now.xyz/dashboard/e/student-union-2026/ballot" width={1000} height={760}>
              <AppHeader active="Ballot" />
              <div className="absolute left-[50px] right-[50px] top-[124px]">
                {POSITIONS.map((position, i) => {
                  const start = 12 + i * 14;
                  const s = soft(frame, start, fps);
                  return (
                    <div
                      key={position.title}
                      className="mb-4 rounded-2xl border border-line bg-card p-5 shadow-[0_10px_30px_-24px_rgba(9,9,11,0.4)]"
                      style={{ opacity: s, transform: `translateY(${(1 - s) * 70}px)` }}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <span className="font-mono text-[14px] text-faint">0{i + 1}</span>
                        <span className="text-[22px] font-semibold text-ink">{position.title}</span>
                        <span className="rounded-full border border-line bg-wash px-2.5 py-0.5 text-[13px] text-muted">{position.hint}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        {position.candidates.map((name, j) => {
                          const a = pop(frame, start + 8 + j * 4, fps, 220, 11);
                          const index = avatarIndex++;
                          return (
                            <div key={name} className="flex items-center gap-3" style={{ opacity: Math.min(1, a * 1.4), transform: `scale(${0.5 + a * 0.5})`, transformOrigin: "left center" }}>
                              <Avatar name={name} size={50} index={index} />
                              <span className="text-[18px] font-medium text-ink">{name}</span>
                            </div>
                          );
                        })}
                        {position.yesno && (
                          <div className="ml-auto flex gap-2">
                            {["Yes", "No"].map((v) => (
                              <span key={v} className="rounded-lg border border-line px-4 py-1.5 text-[16px] font-medium text-muted">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex h-[70px] items-center justify-between border-t border-line bg-card/95 px-6">
                <span className="text-[16px] text-muted">3 positions · 6 candidates</span>
                <div className="flex gap-3">
                  <span className="flex h-[44px] items-center rounded-xl border border-line px-4 text-[16px] font-medium text-ink">Preview as voter</span>
                  <span
                    className="flex h-[44px] w-[150px] items-center justify-center gap-2 rounded-xl text-[16px] font-medium text-white"
                    style={{
                      background: saved ? "#16a34a" : "#09090b",
                      transform: `scale(${frame >= 128 && frame < 134 ? 0.94 : saved ? 0.9 + savedPop * 0.1 : 1})`,
                    }}
                  >
                    {saved ? (
                      <>
                        <Icon name="check" size={18} stroke={3} /> Saved
                      </>
                    ) : (
                      "Save ballot"
                    )}
                  </span>
                </div>
              </div>
              <Cursor
                path={[
                  { frame: 100, x: 640, y: 560 },
                  { frame: 124, x: 905, y: 676 },
                ]}
                clicks={[128]}
              />
            </BrowserFrame>
          </div>
        </div>
        <div className="absolute left-[1220px] top-[310px] w-[600px]">
          <Caption index="02" label="Ballot" title="Build the ballot." sub="Single choice, pick several, or Yes / No for uncontested seats." highlight={["ballot"]} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
