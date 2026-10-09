import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, pop, soft, tween, typed } from "../motion";
import { Caption, Cursor } from "../ui/Bits";
import { AppHeader, BrowserFrame } from "../ui/Frames";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

function Field({ label, value, focused, frame }: { label: string; value: string; focused: boolean; frame: number }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[16px] font-medium text-ink">{label}</div>
      <div
        className="flex h-[52px] items-center rounded-xl border bg-card px-4 text-[19px] text-ink"
        style={{ borderColor: focused ? "#ea580c" : "#e4e4e7", boxShadow: focused ? "0 0 0 4px rgba(234,88,12,0.14)" : "none" }}
      >
        {value}
        {focused && Math.floor(frame / 8) % 2 === 0 && <span className="ml-0.5 inline-block h-6 w-[2px] bg-ink" />}
      </div>
    </div>
  );
}

export function Create({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = soft(frame, 2, fps);
  const push = tween(frame, [0, duration], [0, 0.05]);
  const step = frame < 92 ? 0 : 1;
  const title = typed("Student Union Elections 2026", frame, 18, 0.95);
  const org = typed("Riverside University SU", frame, 52, 1);
  const slug = pop(frame, 80, fps);
  const stepFill = tween(frame, [88, 100], [0, 1]);
  const pressed = frame >= 132 && frame < 138;
  const toast = pop(frame, 140, fps, 170, 15);
  const swap = tween(frame, [88, 98], [0, 1]);

  return (
    <Scene duration={duration}>
      <AbsoluteFill style={{ transform: `scale(${1 + push})` }}>
        <div className="absolute left-[140px] top-[300px] w-[620px]">
          <Caption index="01" label="Create" title="Set up in minutes." sub="Name it, schedule it, choose who sees the results." highlight={["minutes"]} />
        </div>
        <div className="absolute left-[820px] top-[150px]" style={{ perspective: 2400 }}>
          <div
            style={{
              transform: `translateX(${(1 - enter) * 520}px) rotateY(${-34 + enter * 20}deg) rotateX(${8 - enter * 3}deg)`,
              opacity: enter,
              transformOrigin: "left center",
            }}
          >
            <BrowserFrame url="vote-now.xyz/dashboard/new" width={1000} height={760}>
              <AppHeader />
              <div className="absolute left-[180px] top-[100px] h-[540px] w-[640px] rounded-[22px] border border-line bg-card p-8 shadow-[0_20px_50px_-30px_rgba(9,9,11,0.3)]">
                <div className="text-[30px] font-bold tracking-tight text-ink">New election</div>
                <div className="mb-6 text-[17px] text-muted">Start with the basics.</div>
                <div className="mb-7 flex gap-2">
                  {["Basics", "Schedule", "Results"].map((label, i) => (
                    <div key={label} className="flex-1">
                      <div className="mb-2 h-[5px] overflow-hidden rounded-full bg-wash">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${i === 0 ? 100 : i === 1 ? stepFill * 100 : 0}%` }} />
                      </div>
                      <div className={`text-[14px] ${i === step ? "font-medium text-brand" : "text-faint"}`}>
                        {i + 1}. {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ opacity: 1 - swap, transform: `translateX(${-swap * 40}px)`, position: "absolute", left: 32, right: 32 }}>
                  <Field label="Election title" value={title} focused={frame >= 14 && frame < 50} frame={frame} />
                  <Field label="Organization" value={org} focused={frame >= 50 && frame < 80} frame={frame} />
                  <div className="flex items-center gap-3 text-[16px]" style={{ opacity: slug, transform: `scale(${0.9 + slug * 0.1})`, transformOrigin: "left" }}>
                    <span className="text-muted">vote-now.xyz/e/</span>
                    <span className="font-medium text-ink">student-union-2026</span>
                    <span className="rounded-full bg-good-soft px-2.5 py-0.5 text-[13px] font-medium text-good">Available</span>
                  </div>
                </div>
                <div style={{ opacity: swap, transform: `translateX(${(1 - swap) * 40}px)`, position: "absolute", left: 32, right: 32 }}>
                  {[
                    { label: "Voting opens", value: "Mon 14 Oct · 9:00 AM", at: 100 },
                    { label: "Voting closes", value: "Mon 14 Oct · 5:00 PM", at: 106 },
                  ].map((chip) => {
                    const p = pop(frame, chip.at, fps);
                    return (
                      <div key={chip.label} className="mb-4 flex items-center gap-4 rounded-xl border border-line bg-paper p-4" style={{ opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon name="calendar" size={22} />
                        </div>
                        <div>
                          <div className="text-[14px] text-muted">{chip.label}</div>
                          <div className="text-[19px] font-medium text-ink">{chip.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="absolute bottom-7 right-8 flex h-[50px] items-center gap-2 rounded-xl bg-ink px-6 text-[18px] font-medium text-white"
                  style={{ transform: `scale(${pressed ? 0.95 : 1})`, opacity: tween(frame, [96, 104], [0.35, 1]) }}
                >
                  Create election
                  <Icon name="arrow" size={18} />
                </div>
              </div>
              <div
                className="absolute bottom-6 right-6 flex items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-[0_20px_40px_-20px_rgba(9,9,11,0.35)]"
                style={{ opacity: toast, transform: `translateY(${(1 - toast) * 40}px) scale(${0.9 + toast * 0.1})` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-good text-white">
                  <Icon name="check" size={18} stroke={3} />
                </div>
                <div className="text-[18px] font-medium text-ink">Election created</div>
              </div>
              <Cursor
                path={[
                  { frame: 108, x: 960, y: 760 },
                  { frame: 128, x: 700, y: 596 },
                ]}
                clicks={[132]}
              />
            </BrowserFrame>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
