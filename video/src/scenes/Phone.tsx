import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeIn, easeInOut, easeOut, pop, soft, tween, typed } from "../motion";
import { Avatar, Kicker, MaskWords, Tap } from "../ui/Bits";
import { LogoMark, PhoneFrame } from "../ui/Frames";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const SCREEN_W = 412;
const SCREEN_H = 872;

const LINES = [
  { start: 0, end: 66, text: "One tap to the ballot.", highlight: ["tap"] },
  { start: 66, end: 150, text: "Pick your candidates.", highlight: ["Pick"] },
  { start: 150, end: 196, text: "Submit.", highlight: [] },
  { start: 196, end: 400, text: "Counted. Secretly.", highlight: ["Secretly"] },
];

function SwapLine() {
  const frame = useCurrentFrame();
  return (
    <div className="relative h-[200px] overflow-hidden">
      {LINES.map((line) => {
        if (frame < line.start - 1 || frame > line.end + 8) return null;
        const out = tween(frame, [line.end - 2, line.end + 6], [0, 1], easeIn);
        return (
          <div key={line.text} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${-out * 100}%)`, opacity: 1 - out }}>
            <h2 className="text-[96px] font-bold leading-[1.02] tracking-[-0.045em] text-ink">
              <MaskWords text={line.text} start={line.start} stagger={3} highlight={line.highlight} />
            </h2>
          </div>
        );
      })}
    </div>
  );
}

function LockScreen({ f }: { f: number }) {
  const { fps } = useVideoConfig();
  const note = pop(f, 12, fps, 170, 15);
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(165deg, #fdba74 0%, #fb7185 55%, #a78bfa 100%)" }}>
      <div className="mt-[120px] text-center text-[96px] font-semibold leading-none tracking-tight text-white">9:41</div>
      <div className="mt-3 text-center text-[20px] font-medium text-white/85">Monday 14 October</div>
      <div
        className="absolute left-4 right-4 top-[300px] rounded-[28px] bg-white/90 p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.4)]"
        style={{ opacity: note, transform: `translateY(${(1 - note) * -70}px) scale(${0.92 + note * 0.08})` }}
      >
        <div className="mb-1.5 flex items-center gap-2 text-[14px] text-muted">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
            <Icon name="shield" size={14} stroke={2.4} />
          </div>
          <span className="font-semibold uppercase tracking-wide">VoteNow</span>
          <span className="ml-auto">now</span>
        </div>
        <div className="text-[19px] font-semibold text-ink">You&apos;re invited to vote</div>
        <div className="text-[16px] leading-snug text-muted">Student Union Elections 2026. Tap to cast your ballot.</div>
      </div>
      <Tap x={206} y={350} at={36} />
    </div>
  );
}

function ElectionScreen({ f }: { f: number }) {
  return (
    <div className="absolute inset-0 bg-paper px-6 pt-[78px]">
      <div className="mb-8 flex items-center gap-2">
        <LogoMark size={30} />
        <span className="text-[16px] font-medium text-muted">Riverside University SU</span>
      </div>
      <div className="mb-4 text-[34px] font-bold leading-[1.08] tracking-tight text-ink">Student Union Elections 2026</div>
      <span className="inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-good-soft px-3 py-1 text-[15px] font-medium text-good">
        <span className="h-2 w-2 rounded-full bg-good" /> Voting open · closes 5:00 PM
      </span>
      <div className="mt-10 rounded-2xl border border-line bg-card p-5">
        <div className="mb-3 text-[14px] uppercase tracking-wider text-faint">On the ballot</div>
        {["President", "Vice President", "Treasurer"].map((p) => (
          <div key={p} className="flex items-center justify-between border-b border-line/70 py-3 text-[18px] last:border-0">
            <span className="font-medium text-ink">{p}</span>
            <Icon name="arrow" size={16} color="#a1a1aa" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-[56px] left-6 right-6 flex h-[64px] items-center justify-center gap-2 rounded-[18px] bg-ink text-[20px] font-semibold text-white" style={{ transform: `scale(${f >= 22 && f < 28 ? 0.96 : 1})` }}>
        Cast your vote <Icon name="arrow" size={20} />
      </div>
      <Tap x={206} y={784} at={22} />
    </div>
  );
}

function Option({ name, index, selected, sel }: { name: string; index: number; selected: boolean; sel: number }) {
  return (
    <div
      className="mb-2 flex h-[62px] items-center gap-3 rounded-2xl border px-3"
      style={{
        borderColor: selected ? "#ea580c" : "#e4e4e7",
        background: selected ? "#fff7ed" : "#ffffff",
        transform: selected ? `scale(${0.97 + sel * 0.03})` : undefined,
      }}
    >
      <Avatar name={name} size={40} index={index} />
      <span className="flex-1 text-[18px] font-medium text-ink">{name}</span>
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2" style={{ borderColor: selected ? "#ea580c" : "#d4d4d8", background: selected ? "#ea580c" : "transparent" }}>
        {selected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </div>
  );
}

function BallotScreen({ f }: { f: number }) {
  const { fps } = useVideoConfig();
  const ada = f >= 18;
  const yes = f >= 42;
  const adaPop = pop(f, 18, fps, 240, 12);
  const yesPop = pop(f, 42, fps, 240, 12);
  return (
    <div className="absolute inset-0 bg-paper px-[18px] pt-[72px]">
      <div className="mb-3 text-[26px] font-bold tracking-tight text-ink">Cast your vote</div>
      <div className="mb-5 flex gap-1.5">
        {[ada, yes, false].map((on, i) => (
          <div key={i} className="h-[5px] flex-1 rounded-full" style={{ background: on ? "#ea580c" : "#e4e4e7" }} />
        ))}
      </div>
      <div className="mb-3 rounded-[22px] border border-line bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[19px] font-semibold text-ink">President</span>
          <span className="text-[13px] uppercase tracking-wider text-faint">Choose one</span>
        </div>
        <Option name="Ada Okafor" index={0} selected={ada} sel={adaPop} />
        <Option name="Tunde Bello" index={1} selected={false} sel={0} />
        <Option name="Grace Mensah" index={2} selected={false} sel={0} />
      </div>
      <div className="rounded-[22px] border border-line bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[19px] font-semibold text-ink">Vice President</span>
          <span className="text-[13px] uppercase tracking-wider text-faint">Yes / No</span>
        </div>
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar name="Kemi Adeyemi" size={40} index={3} />
          <span className="flex-1 text-[18px] font-medium text-ink">Kemi Adeyemi</span>
          <span
            className="rounded-xl border px-4 py-2 text-[16px] font-semibold"
            style={{ borderColor: yes ? "#ea580c" : "#e4e4e7", background: yes ? "#ea580c" : "#fff", color: yes ? "#fff" : "#71717a", transform: `scale(${yes ? 0.9 + yesPop * 0.1 : 1})` }}
          >
            Yes
          </span>
          <span className="rounded-xl border border-line px-4 py-2 text-[16px] font-semibold text-muted">No</span>
        </div>
      </div>
      <div
        className="absolute bottom-[50px] left-[18px] right-[18px] flex h-[60px] items-center justify-center rounded-[18px] text-[19px] font-semibold text-white"
        style={{ background: yes ? "#09090b" : "#a1a1aa", transform: `scale(${f >= 66 && f < 72 ? 0.96 : 1})` }}
      >
        Review my ballot
      </div>
      <Tap x={150} y={232} at={18} />
      <Tap x={262} y={500} at={42} />
      <Tap x={206} y={792} at={66} />
    </div>
  );
}

function ReviewScreen({ f }: { f: number }) {
  const rows: [string, ReactNode][] = [
    ["President", <span key="p" className="flex items-center gap-2"><Avatar name="Ada Okafor" size={30} index={0} />Ada Okafor</span>],
    ["Vice President", "Yes · Kemi Adeyemi"],
    ["Treasurer", <span key="t" className="flex items-center gap-2"><Avatar name="David Eze" size={30} index={4} />David Eze</span>],
  ];
  return (
    <div className="absolute inset-0 bg-paper px-[18px] pt-[78px]">
      <div className="mb-1 text-[26px] font-bold tracking-tight text-ink">Review your ballot</div>
      <div className="mb-6 text-[16px] text-muted">Once submitted, your vote is final.</div>
      <div className="overflow-hidden rounded-[22px] border border-line bg-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-b border-line/70 px-4 py-4 last:border-0">
            <span className="text-[13px] uppercase tracking-wider text-faint">{k}</span>
            <span className="text-[17px] font-medium text-ink">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-3 rounded-[22px] border border-brand-line bg-brand-soft p-4 text-left">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-card text-brand">
          <Icon name="lock" size={20} />
        </div>
        <div className="text-[16px] leading-snug text-brand-strong">
          <div className="font-semibold">Your ballot is secret.</div>
          Organizers see that you voted, never how.
        </div>
      </div>
      <div
        className="absolute bottom-[50px] left-[18px] right-[18px] flex h-[60px] items-center justify-center rounded-[18px] bg-ink text-[19px] font-semibold text-white"
        style={{ transform: `scale(${f >= 32 && f < 38 ? 0.96 : 1})` }}
      >
        Submit my vote
      </div>
      <Tap x={206} y={792} at={32} />
    </div>
  );
}

function SuccessScreen({ f }: { f: number }) {
  const { fps } = useVideoConfig();
  const circle = pop(f, 2, fps, 200, 11);
  const check = tween(f, [6, 20], [0, 1], easeOut);
  const burst = tween(f, [4, 30], [0, 1], easeOut);
  const title = tween(f, [16, 28], [0, 1]);
  const card = pop(f, 30, fps, 160, 16);
  const code = typed("K7QM-4XPA-9TRD", f, 36, 0.6);
  const warn = pop(f, 58, fps, 200, 14);
  return (
    <div className="absolute inset-0 bg-paper px-6 pt-[180px] text-center">
      <div className="relative mx-auto mb-8 h-[130px] w-[130px]">
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          const r = 60 + burst * 95;
          return (
            <span
              key={i}
              className="absolute h-3 w-3 rounded-full"
              style={{
                left: 65 + Math.cos(a) * r - 6,
                top: 65 + Math.sin(a) * r - 6,
                background: i % 2 ? "#ea580c" : "#16a34a",
                opacity: f < 4 ? 0 : 1 - burst,
                transform: `scale(${1 - burst * 0.6})`,
              }}
            />
          );
        })}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-good" style={{ transform: `scale(${circle})`, boxShadow: "0 20px 40px -12px rgba(22,163,74,0.55)" }}>
          <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check} />
          </svg>
        </div>
      </div>
      <div style={{ opacity: title, transform: `translateY(${(1 - title) * 16}px)` }}>
        <div className="text-[38px] font-bold tracking-tight text-ink">Vote counted</div>
        <div className="mt-1 text-[18px] text-muted">Recorded securely and anonymously.</div>
      </div>
      <div className="mt-9 rounded-[22px] border border-line bg-card p-5" style={{ opacity: card, transform: `translateY(${(1 - card) * 30}px)` }}>
        <div className="mb-2 text-[13px] uppercase tracking-[0.2em] text-faint">Your receipt code</div>
        <div className="h-[40px] font-mono text-[30px] font-bold tracking-[0.12em] text-brand-strong">{code}</div>
      </div>
      <div
        className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#fde68a] bg-[#fef9c3] px-4 py-2 text-[15px] font-medium text-[#a16207]"
        style={{ opacity: warn, transform: `scale(${0.85 + warn * 0.15})` }}
      >
        Save this code now
      </div>
    </div>
  );
}

const SCREENS = [
  { start: 0, Screen: LockScreen },
  { start: 44, Screen: ElectionScreen },
  { start: 70, Screen: BallotScreen },
  { start: 150, Screen: ReviewScreen },
  { start: 196, Screen: SuccessScreen },
];
const PUSH = 10;

export function Phone({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = soft(frame, 0, fps);
  const sub = tween(frame, [14, 28], [0, 1]);
  const float = Math.sin(frame / 22) * 6;

  return (
    <Scene duration={duration}>
      <AbsoluteFill>
        <div className="absolute left-[140px] top-[330px] w-[880px]">
          <Kicker index="04" label="Vote" start={0} />
          <p className="mb-5 text-[30px] text-muted" style={{ opacity: sub, transform: `translateY(${(1 - sub) * 16}px)` }}>
            No account. No app. Just a private link.
          </p>
          <SwapLine />
        </div>
        <div
          className="absolute left-[1240px] top-[90px]"
          style={{ transform: `translateY(${(1 - enter) * 1000 + float}px) rotate(${-3 - (1 - enter) * 8}deg)`, transformOrigin: "center bottom" }}
        >
          <PhoneFrame>
            <div className="absolute inset-0 overflow-hidden" style={{ width: SCREEN_W, height: SCREEN_H }}>
              {SCREENS.map(({ start, Screen }, i) => {
                const next = SCREENS[i + 1]?.start ?? Infinity;
                if (frame < start || frame > next + PUSH) return null;
                const inT = i === 0 ? 1 : tween(frame, [start, start + PUSH], [0, 1], easeInOut);
                const outT = Number.isFinite(next) ? tween(frame, [next, next + PUSH], [0, 1], easeInOut) : 0;
                const x = (1 - inT) * 100 - outT * 30;
                return (
                  <div key={start} className="absolute inset-0" style={{ transform: `translateX(${x}%)`, zIndex: i, boxShadow: inT < 1 ? "-20px 0 40px rgba(0,0,0,0.15)" : undefined }}>
                    <Screen f={frame - start} />
                  </div>
                );
              })}
            </div>
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
