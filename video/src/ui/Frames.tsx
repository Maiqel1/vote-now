import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

export function BrowserFrame({
  url,
  width,
  height,
  children,
  style,
}: {
  url: string;
  width: number;
  height: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="overflow-hidden rounded-[22px] border border-line bg-card"
      style={{
        width,
        height,
        boxShadow: "0 50px 120px -30px rgba(9,9,11,0.28), 0 20px 40px -20px rgba(234,88,12,0.18)",
        ...style,
      }}
    >
      <div className="flex h-[52px] items-center gap-3 border-b border-line bg-wash/70 px-5">
        <div className="flex gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-8 w-[46%] items-center justify-center gap-2 rounded-lg bg-card text-[15px] text-muted ring-1 ring-line">
          <Icon name="lock" size={13} stroke={2.2} />
          {url}
        </div>
        <div className="w-[60px]" />
      </div>
      <div className="relative" style={{ height: height - 52 }}>
        {children}
      </div>
    </div>
  );
}

export function AppHeader({ active }: { active?: string }) {
  const tabs = ["Overview", "Ballot", "Voters", "Invitations", "Results", "Activity"];
  return (
    <div className="border-b border-line px-8 pt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={30} />
          <span className="text-[19px] font-semibold tracking-tight text-ink">
            Vote<span className="text-brand">Now</span>
          </span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-[13px] font-semibold text-brand-strong">
          OM
        </div>
      </div>
      {active && (
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`-mb-px border-b-2 px-3 pb-3 text-[16px] ${tab === active ? "border-brand font-medium text-ink" : "border-transparent text-muted"}`}
            >
              {tab}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 40, radius }: { size?: number; radius?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-ink text-white"
      style={{ width: size, height: size, borderRadius: radius ?? size * 0.26 }}
    >
      <Icon name="shield" size={size * 0.52} stroke={2.2} />
    </div>
  );
}

export function PhoneFrame({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="relative rounded-[70px] bg-ink p-[14px]"
      style={{
        width: 440,
        height: 900,
        boxShadow: "0 60px 120px -30px rgba(9,9,11,0.45), 0 0 0 2px #27272a inset",
        ...style,
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[56px] bg-card">
        {children}
        <div className="absolute left-1/2 top-[14px] h-[34px] w-[124px] -translate-x-1/2 rounded-full bg-ink" />
      </div>
    </div>
  );
}
