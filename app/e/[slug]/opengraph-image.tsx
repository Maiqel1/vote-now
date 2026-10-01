import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Election on VoteNow";

interface Meta {
  title: string;
  orgName: string;
  accentColor: string | null;
}

async function loadMeta(slug: string): Promise<Meta | null> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/e/${encodeURIComponent(slug)}/meta`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as Meta) : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({ params }: { params: { slug: string } }) {
  const meta = await loadMeta(params.slug);
  const title = meta?.title ?? "VoteNow";
  const org = meta?.orgName ?? "Secure online elections";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1020 0%, #121a33 60%, #2a1f0a 100%)",
          color: "#f3ede3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: meta?.accentColor ?? "#f5a524" }} />
          <div style={{ fontSize: 30, opacity: 0.85 }}>{org}</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.7 }}>
          <span>Secret ballot · One vote per voter</span>
          <span style={{ color: "#f5a524" }}>VoteNow</span>
        </div>
      </div>
    ),
    size,
  );
}
