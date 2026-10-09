import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { count, easeInOut, pop, soft, tween } from "../motion";
import { Avatar, Caption } from "../ui/Bits";
import { AppHeader, BrowserFrame } from "../ui/Frames";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const RESULTS = [
  { name: "Ada Okafor", share: 58, index: 0 },
  { name: "Tunde Bello", share: 31, index: 1 },
  { name: "Grace Mensah", share: 11, index: 2 },
];

export function Results({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = soft(frame, 0, fps);
  const push = tween(frame, [0, duration], [0, 0.05]);
  const ring = tween(frame, [12, 92], [0, 0.87], easeInOut);
  const pct = Math.round(ring * 100);
  const voted = count(frame, [12, 92], 174);
  const crown = pop(frame, 108, fps, 220, 10);
  const live = 0.55 + Math.sin(frame / 5) * 0.45;
  const R = 78;
  const C = 2 * Math.PI * R;

  return (
    <Scene duration={duration}>
      <AbsoluteFill style={{ transform: `scale(${1 + push})` }}>
        <div className="absolute left-[140px] top-[310px] w-[620px]">
          <Caption index="05" label="Results" title="Watch it live." sub="Turnout and tallies update in real time. Publish when you decide." highlight={["live"]} />
        </div>
        <div className="absolute left-[820px] top-[130px]" style={{ perspective: 2400 }}>
          <div
            style={{
              transform: `translateX(${(1 - enter) * 520}px) rotateY(${-34 + enter * 22}deg) rotateX(${8 - enter * 3}deg)`,
              opacity: enter,
              transformOrigin: "left center",
            }}
          >
            <BrowserFrame url="vote-now.xyz/dashboard/e/student-union-2026/results" width={1000} height={800}>
              <AppHeader active="Results" />
              <div className="absolute left-[36px] right-[36px] top-[136px] flex gap-5">
                <div className="relative flex w-[330px] flex-col items-center rounded-2xl border border-line bg-card p-5">
                  <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-good-soft px-2.5 py-0.5 text-[13px] font-semibold text-good">
                    <span className="h-2 w-2 rounded-full bg-good" style={{ opacity: live }} /> LIVE
                  </span>
                  <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                    <circle cx="100" cy="100" r={R} fill="none" stroke="#f4f4f5" strokeWidth="18" />
                    <circle cx="100" cy="100" r={R} fill="none" stroke="url(#ring)" strokeWidth="18" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} />
                    <defs>
                      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fdba74" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute top-[88px] text-center">
                    <div className="text-[46px] font-bold leading-none tabular-nums tracking-tight text-ink">{pct}%</div>
                    <div className="mt-1 text-[14px] text-muted">Turnout</div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-5">
                  {[
                    { label: "Voted", value: voted },
                    { label: "Eligible voters", value: 200 },
                  ].map((tile) => (
                    <div key={tile.label} className="flex-1 rounded-2xl border border-line bg-card p-5">
                      <div className="text-[50px] font-bold leading-none tabular-nums tracking-tight text-ink">{tile.value}</div>
                      <div className="mt-2 text-[16px] text-muted">{tile.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute left-[36px] right-[36px] top-[408px] rounded-2xl border border-line bg-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[24px] font-semibold text-ink">President</span>
                  <span className="text-[15px] text-muted">{voted} votes</span>
                </div>
                {RESULTS.map((r, i) => {
                  const grow = tween(frame, [30 + i * 4, 104], [0, r.share], easeInOut);
                  const winner = i === 0;
                  return (
                    <div key={r.name} className="mb-5 last:mb-0">
                      <div className="mb-2 flex items-center gap-3">
                        <Avatar name={r.name} size={38} index={r.index} />
                        <span className="text-[19px] font-medium text-ink">{r.name}</span>
                        {winner && (
                          <span
                            className="flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-0.5 text-[14px] font-semibold text-brand-strong"
                            style={{ opacity: crown, transform: `scale(${0.4 + crown * 0.6}) rotate(${(1 - crown) * -20}deg)` }}
                          >
                            <Icon name="crown" size={15} stroke={2.4} /> Winner
                          </span>
                        )}
                        <span className="ml-auto text-[19px] font-semibold tabular-nums" style={{ color: winner ? "#c2410c" : "#71717a" }}>
                          {Math.round(grow)}%
                        </span>
                      </div>
                      <div className="h-[12px] overflow-hidden rounded-full bg-wash">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${grow}%`,
                            background: winner ? "linear-gradient(90deg, #fdba74, #ea580c)" : "#d4d4d8",
                            boxShadow: winner ? "0 0 16px rgba(234,88,12,0.45)" : undefined,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </BrowserFrame>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
