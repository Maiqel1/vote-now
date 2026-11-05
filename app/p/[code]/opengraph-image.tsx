import { ImageResponse } from "next/og";
import { BRAND_ORANGE } from "@/components/brand/BrandIcon";
import type { PollResultsPayload } from "@/lib/polls";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Poll on VoteNow";

async function loadPoll(code: string): Promise<PollResultsPayload | null> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/p/${encodeURIComponent(code)}/results`, { next: { revalidate: 300 } });
    return res.ok ? ((await res.json()) as PollResultsPayload) : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({ params }: { params: { code: string } }) {
  const poll = await loadPoll(params.code);
  const question = poll?.title ?? "Vote in this poll";
  const several = (poll?.questions.length ?? 0) > 1;
  const rows = several
    ? (poll?.questions ?? []).map((q) => ({ id: q.id, label: q.text }))
    : (poll?.questions[0]?.options ?? []).map((o) => ({ id: o.id, label: o.label }));
  const options = rows.slice(0, 4);
  const more = rows.length - options.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "radial-gradient(ellipse at 100% 0%, #fed7aa 0%, #fff7ed 35%, #ffffff 70%)",
          color: "#09090b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#c2410c", fontWeight: 600 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: BRAND_ORANGE }} />
          {poll?.status === "closed" ? "Poll closed" : "Poll open · vote now"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: question.length > 80 ? 48 : 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 1060 }}>
            {question}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {options.map((option) => (
              <div
                key={option.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 28,
                  color: "#27272a",
                  padding: "10px 20px",
                  borderRadius: 14,
                  border: "2px solid #e4e4e7",
                  background: "rgba(255,255,255,0.8)",
                  maxWidth: 900,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: several ? 6 : 11, border: "3px solid #a1a1aa" }} />
                <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 820 }}>{option.label}</span>
              </div>
            ))}
            {more > 0 && <div style={{ fontSize: 24, color: "#71717a" }}>+{more} more</div>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#52525b" }}>
          <span>{several ? `${rows.length} questions · No sign-up needed` : "Instant poll · No sign-up needed"}</span>
          <span style={{ display: "flex" }}>
            <span>Vote</span>
            <span style={{ color: BRAND_ORANGE }}>Now</span>
          </span>
        </div>
      </div>
    ),
    size,
  );
}
