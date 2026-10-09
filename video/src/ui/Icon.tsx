const PATHS: Record<string, string[]> = {
  shield: [
    "M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z",
  ],
  chat: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  paper: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8", "M8 17h5"],
  sheet: ["M3 3h18v18H3z", "M3 9h18", "M3 15h18", "M9 3v18", "M15 3v18"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  key: ["M15.5 7.5a4.5 4.5 0 1 1-4.31 5.78L4 20.5V17h3v-3h3l1.22-1.22A4.5 4.5 0 0 1 15.5 7.5z", "M16 9h.01"],
  scroll: ["M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4", "M19 17V5a2 2 0 0 0-2-2H4", "M10 8h6", "M10 12h6"],
  check: ["M20 6L9 17l-5-5"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M22 6l-10 7L2 6"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  send: ["M22 2L11 13", "M22 2l-7 20-4-9-9-4 20-7z"],
  crown: ["M2 19h20", "M3 7l5 5 4-7 4 7 5-5-2 10H5z"],
  arrow: ["M5 12h14", "M12 5l7 7-7 7"],
  upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  calendar: ["M3 5h18v16H3z", "M16 3v4", "M8 3v4", "M3 10h18"],
};

export function Icon({
  name,
  size = 24,
  stroke = 2,
  color = "currentColor",
  style,
}: {
  name: keyof typeof PATHS;
  size?: number;
  stroke?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
