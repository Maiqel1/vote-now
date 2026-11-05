import { ImageResponse } from "next/og";
import { BRAND_ORANGE } from "@/components/brand/BrandIcon";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VoteNow: free instant poll maker";

export default function OpenGraphImage() {
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
          background: "radial-gradient(ellipse at 100% 0%, #fed7aa 0%, #fff7ed 38%, #ffffff 72%)",
          color: "#09090b",
        }}
      >
        <div style={{ display: "flex", fontSize: 48, fontWeight: 700, letterSpacing: -2 }}>
          <span>Vote</span>
          <span style={{ color: BRAND_ORANGE }}>Now</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>Free instant poll maker</div>
          <div style={{ fontSize: 32, color: "#52525b", maxWidth: 900 }}>
            Ask a question, share the link, watch the votes come in. No sign-up needed.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#52525b" }}>
          <span>Live results · You set the time limit · Repeat votes blocked</span>
          <span style={{ color: "#c2410c" }}>vote-now.xyz/poll</span>
        </div>
      </div>
    ),
    size,
  );
}
