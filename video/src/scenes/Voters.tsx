import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { count, easeOut, pop, soft, tween } from "../motion";
import { Avatar, Caption, Cursor } from "../ui/Bits";
import { AppHeader, BrowserFrame } from "../ui/Frames";
import { Icon } from "../ui/Icon";
import { Scene, type SceneProps } from "../ui/Scene";

const ROWS = [
  ["Amara Nwosu", "amara.n@riverside.edu"],
  ["Ben Carter", "b.carter@riverside.edu"],
  ["Chiamaka Obi", "chiamaka.obi@riverside.edu"],
  ["Daniel Mensah", "d.mensah@riverside.edu"],
  ["Esther Adebayo", "esther.a@riverside.edu"],
  ["Farouk Lawal", "f.lawal@riverside.edu"],
];

const SEND_X = 1110;
const SEND_Y = 132;

export function Voters({ duration }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = soft(frame, 0, fps);
  const push = tween(frame, [0, duration], [0, 0.04]);
  const dropped = frame >= 36;
  const zone = 1 - tween(frame, [36, 46], [0, 1]);
  const hover = tween(frame, [24, 30], [0, 1]);
  const fileX = tween(frame, [6, 32], [-240, 470], easeOut);
  const fileY = tween(frame, [6, 32], [430, 330], easeOut);
  const fileGone = tween(frame, [34, 42], [0, 1]);
  const voters = count(frame, [46, 92], 200);
  const sending = tween(frame, [118, 158], [0, 1]);
  const sent = Math.round(sending * 200);
  const done = frame >= 160;

  return (
    <Scene duration={duration}>
      <AbsoluteFill style={{ transform: `scale(${1 + push})` }}>
        <div className="absolute left-[140px] top-[96px] w-[760px]">
          <Caption index="03" label="Voters" title="Invite everyone." sub="Import a spreadsheet. One click sends every voter a private link." highlight={["everyone"]} />
        </div>
        <div className="absolute left-[580px] top-[360px]" style={{ perspective: 2600 }}>
          <div style={{ transform: `translateY(${(1 - enter) * 420}px) rotateX(${22 - enter * 14}deg) rotateY(-6deg)`, opacity: enter, transformOrigin: "center top" }}>
            <BrowserFrame url="vote-now.xyz/dashboard/e/student-union-2026/voters" width={1240} height={660}>
              <AppHeader active="Voters" />
              <div className="absolute left-[32px] right-[32px] top-[108px] flex items-center justify-between">
                <div className="flex h-[48px] w-[340px] items-center rounded-xl border border-line px-4 text-[17px] text-faint">Search name or email</div>
                <div className="flex items-center gap-5">
                  <span className="text-[20px] font-semibold tabular-nums text-ink">{voters} voters</span>
                  <span
                    className="flex h-[48px] items-center gap-2 rounded-xl bg-ink px-5 text-[17px] font-medium text-white"
                    style={{ transform: `scale(${frame >= 114 && frame < 120 ? 0.94 : 1})` }}
                  >
                    <Icon name="send" size={18} /> Send invitations
                  </span>
                </div>
              </div>
              {frame >= 116 && (
                <div className="absolute left-[32px] right-[32px] top-[170px] flex items-center gap-4" style={{ opacity: tween(frame, [116, 122], [0, 1]) }}>
                  <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-wash">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#fb923c] to-brand" style={{ width: `${sending * 100}%` }} />
                  </div>
                  <span className="w-[260px] text-right text-[16px] font-medium tabular-nums" style={{ color: done ? "#16a34a" : "#71717a" }}>
                    {done ? "200 invitations sent ✓" : `Sending… ${sent}/200`}
                  </span>
                </div>
              )}
              {!dropped || zone > 0 ? (
                <div
                  className="absolute left-[32px] right-[32px] top-[176px] flex h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed text-[20px]"
                  style={{
                    opacity: zone,
                    borderColor: hover > 0.5 ? "#ea580c" : "#d4d4d8",
                    background: hover > 0.5 ? "rgba(255,247,237,0.9)" : "rgba(244,244,245,0.5)",
                    color: hover > 0.5 ? "#c2410c" : "#71717a",
                  }}
                >
                  <Icon name="upload" size={42} stroke={1.8} />
                  Drop a CSV or paste emails
                </div>
              ) : null}
              {frame >= 44 && (
                <div className="absolute left-[32px] right-[32px] top-[200px]">
                  <div className="mb-1 flex border-b border-line pb-3 text-[13px] font-medium uppercase tracking-wider text-faint">
                    <span className="flex-1">Voter</span>
                    <span className="w-[200px]">Invitation</span>
                    <span className="w-[120px]">Status</span>
                  </div>
                  {ROWS.map(([name, email], i) => {
                    const r = soft(frame, 46 + i * 4, fps);
                    const emailed = frame >= 124 + i * 5;
                    const badge = pop(frame, 124 + i * 5, fps, 240, 14);
                    return (
                      <div key={name} className="flex items-center border-b border-line/70 py-[9px]" style={{ opacity: r, transform: `translateY(${(1 - r) * -24}px)` }}>
                        <div className="flex flex-1 items-center gap-3">
                          <Avatar name={name} size={32} index={i + 2} />
                          <div>
                            <div className="text-[16px] font-medium leading-tight text-ink">{name}</div>
                            <div className="text-[13px] text-muted">{email}</div>
                          </div>
                        </div>
                        <span className="w-[200px]">
                          <span
                            className="inline-block rounded-full border px-2.5 py-0.5 text-[13px] font-medium"
                            style={
                              emailed
                                ? { borderColor: "#bfdbfe", background: "#dbeafe", color: "#2563eb", transform: `scale(${0.8 + badge * 0.2})` }
                                : { borderColor: "#e4e4e7", background: "#f4f4f5", color: "#71717a" }
                            }
                          >
                            {emailed ? "Emailed" : "Not invited"}
                          </span>
                        </span>
                        <span className="w-[120px] text-[14px] text-faint">Not yet</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {fileGone < 1 && (
                <div
                  className="absolute flex items-center gap-3 rounded-2xl border border-line bg-card px-5 py-4 shadow-[0_24px_50px_-20px_rgba(9,9,11,0.45)]"
                  style={{
                    left: fileX,
                    top: fileY,
                    opacity: 1 - fileGone,
                    transform: `rotate(${tween(frame, [6, 32], [-12, 4])}deg) scale(${1 - fileGone * 0.4})`,
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-good-soft text-good">
                    <Icon name="sheet" size={26} />
                  </div>
                  <div>
                    <div className="text-[18px] font-semibold text-ink">members.csv</div>
                    <div className="text-[14px] text-muted">200 rows</div>
                  </div>
                </div>
              )}
              {Array.from({ length: 10 }, (_, i) => {
                const start = 118 + i * 2;
                const t = tween(frame, [start, start + 26], [0, 1], easeOut);
                if (frame < start || t >= 1) return null;
                const angle = (-70 + i * 14) * (Math.PI / 180);
                const distance = 260 + (i % 3) * 70;
                return (
                  <div
                    key={i}
                    className="absolute flex h-10 w-12 items-center justify-center rounded-md bg-card text-brand shadow-md ring-1 ring-brand-line"
                    style={{
                      left: SEND_X + Math.cos(angle) * distance * t - 24,
                      top: SEND_Y + Math.sin(angle) * distance * t - 20 - Math.sin(t * Math.PI) * 60,
                      opacity: 1 - t,
                      transform: `rotate(${(i - 5) * 9 * t}deg) scale(${1 - t * 0.3})`,
                    }}
                  >
                    <Icon name="mail" size={22} />
                  </div>
                );
              })}
              <Cursor
                path={[
                  { frame: 6, x: -200, y: 450 },
                  { frame: 32, x: 520, y: 360 },
                  { frame: 92, x: 520, y: 360 },
                  { frame: 112, x: SEND_X, y: SEND_Y },
                ]}
                clicks={[116]}
              />
            </BrowserFrame>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
}
