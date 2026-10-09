import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, pop, tween } from "../motion";

const AVATAR_GRADIENTS = [
  ["#fb923c", "#ea580c"],
  ["#60a5fa", "#2563eb"],
  ["#34d399", "#059669"],
  ["#f472b6", "#db2777"],
  ["#a78bfa", "#7c3aed"],
  ["#fbbf24", "#d97706"],
];

export function Avatar({ name, size = 56, index = 0, style }: { name: string; size?: number; index?: number; style?: CSSProperties }) {
  const [from, to] = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: "0 0 0 3px #fff, 0 6px 16px -6px rgba(9,9,11,0.35)",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export function MaskWords({
  text,
  start,
  stagger = 2,
  className,
  highlight = [],
  duration = 14,
}: {
  text: string;
  start: number;
  stagger?: number;
  className?: string;
  highlight?: string[];
  duration?: number;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <span className={className} style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "inherit", columnGap: "0.24em" }}>
      {words.map((word, i) => {
        const t = tween(frame, [start + i * stagger, start + i * stagger + duration], [0, 1], easeOut);
        const lit = highlight.includes(word.replace(/[.,!?]/g, ""));
        return (
          <span key={`${word}-${i}`} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - t) * 110}%) rotate(${(1 - t) * 6}deg)`,
                transformOrigin: "left bottom",
                color: lit ? "#ea580c" : undefined,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function Kicker({ index, label, start }: { index: string; label: string; start: number }) {
  const frame = useCurrentFrame();
  const t = tween(frame, [start, start + 14], [0, 1]);
  return (
    <div className="mb-6 flex items-center gap-3 text-[22px] font-medium" style={{ opacity: t, transform: `translateX(${(1 - t) * -24}px)` }}>
      <span className="font-mono text-brand">{index}</span>
      <span className="h-px bg-brand" style={{ width: 48 * t }} />
      <span className="uppercase tracking-[0.2em] text-muted">{label}</span>
    </div>
  );
}

export function Caption({
  index,
  label,
  title,
  sub,
  start = 0,
  highlight = [],
}: {
  index: string;
  label: string;
  title: string;
  sub?: string;
  start?: number;
  highlight?: string[];
}) {
  const frame = useCurrentFrame();
  const subT = tween(frame, [start + 16, start + 32], [0, 1]);
  return (
    <div>
      <Kicker index={index} label={label} start={start} />
      <h2 className="text-[82px] font-bold leading-[1.02] tracking-[-0.04em] text-ink">
        <MaskWords text={title} start={start + 4} stagger={3} highlight={highlight} />
      </h2>
      {sub && (
        <p className="mt-7 max-w-[560px] text-[28px] leading-snug text-muted" style={{ opacity: subT, transform: `translateY(${(1 - subT) * 16}px)` }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function Cursor({
  path,
  clicks = [],
  style,
}: {
  path: { frame: number; x: number; y: number }[];
  clicks?: number[];
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const z = path[i + 1];
    if (frame >= a.frame && frame <= z.frame) {
      x = tween(frame, [a.frame, z.frame], [a.x, z.x], easeOut);
      y = tween(frame, [a.frame, z.frame], [a.y, z.y], easeOut);
    } else if (frame > z.frame) {
      x = z.x;
      y = z.y;
    }
  }
  const press = clicks.reduce((acc, c) => {
    const d = frame - c;
    return d >= 0 && d < 8 ? Math.min(acc, 0.82 + (d / 8) * 0.18) : acc;
  }, 1);
  const visible = tween(frame, [path[0].frame, path[0].frame + 6], [0, 1]);
  return (
    <>
      {clicks.map((c) => {
        const r = pop(frame, c, fps, 120, 18);
        if (frame < c || frame > c + 24) return null;
        return (
          <div
            key={c}
            className="pointer-events-none absolute rounded-full border-[3px] border-brand"
            style={{
              left: x - 30,
              top: y - 30,
              width: 60,
              height: 60,
              transform: `scale(${0.3 + r * 1.2})`,
              opacity: 1 - tween(frame, [c, c + 24], [0, 1]),
            }}
          />
        );
      })}
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        className="absolute"
        style={{ left: x - 6, top: y - 4, opacity: visible, transform: `scale(${press})`, transformOrigin: "6px 4px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))", ...style }}
      >
        <path d="M4 2l15 11-7 1.2 4.2 7.3-3 1.7L9 16l-5 5z" fill="#09090b" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </>
  );
}

export function Tap({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  if (frame < at - 6 || frame > at + 22) return null;
  const inT = tween(frame, [at - 6, at], [0, 1]);
  const outT = tween(frame, [at, at + 22], [0, 1]);
  return (
    <>
      <div
        className="absolute rounded-full bg-ink/25"
        style={{ left: x - 26, top: y - 26, width: 52, height: 52, opacity: inT * (1 - outT), transform: `scale(${1 - outT * 0.3})` }}
      />
      <div
        className="absolute rounded-full border-[3px] border-brand"
        style={{ left: x - 26, top: y - 26, width: 52, height: 52, opacity: frame >= at ? 1 - outT : 0, transform: `scale(${1 + outT * 1.4})` }}
      />
    </>
  );
}

export function Pill({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[15px] font-medium ${className}`} style={style}>
      {children}
    </span>
  );
}
