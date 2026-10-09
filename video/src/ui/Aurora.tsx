import { AbsoluteFill, useCurrentFrame } from "remotion";

const BLOBS = [
  { color: "rgba(251,146,60,0.75)", size: 1100, x: 1500, y: -120, ax: 160, ay: 90, speed: 0.011, phase: 0 },
  { color: "rgba(253,186,116,0.8)", size: 900, x: 300, y: 820, ax: 140, ay: 70, speed: 0.009, phase: 1.7 },
  { color: "rgba(251,180,190,0.7)", size: 820, x: 1100, y: 980, ax: 180, ay: 60, speed: 0.013, phase: 3.1 },
  { color: "rgba(253,224,120,0.65)", size: 760, x: 120, y: 60, ax: 120, ay: 100, speed: 0.01, phase: 4.2 },
];

export function Aurora({ intensity = 1 }: { intensity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#fcfcfc", overflow: "hidden" }}>
      {BLOBS.map((blob, i) => {
        const x = blob.x + Math.sin(frame * blob.speed + blob.phase) * blob.ax - blob.size / 2;
        const y = blob.y + Math.cos(frame * blob.speed * 0.8 + blob.phase) * blob.ay - blob.size / 2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: blob.size,
              height: blob.size,
              borderRadius: "50%",
              background: `radial-gradient(circle at center, ${blob.color} 0%, transparent 65%)`,
              opacity: intensity,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 45%, rgba(252,252,252,0.0) 0%, rgba(252,252,252,0.35) 80%)",
        }}
      />
    </AbsoluteFill>
  );
}
