import { ImageResponse } from "next/og";
import { BRAND_ORANGE } from "@/components/brand/BrandIcon";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VoteNow: run an election people actually trust";

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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: BRAND_ORANGE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>
            <span>Vote</span>
            <span style={{ color: BRAND_ORANGE }}>Now</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2.5, maxWidth: 980 }}>
            Run an election people actually trust.
          </div>
          <div style={{ fontSize: 30, color: "#52525b", maxWidth: 900 }}>
            Build the ballot, invite your voters and publish results in an afternoon.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#52525b" }}>
          <span>Secret ballot · One vote per voter · Live results</span>
          <span style={{ color: "#c2410c" }}>vote-now.xyz</span>
        </div>
      </div>
    ),
    size,
  );
}
