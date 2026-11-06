import { ImageResponse } from "next/og";
import { BRAND_ORANGE } from "@/components/brand/BrandIcon";
import { getPost } from "@/lib/blog";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VoteNow blog";

export default function OpenGraphImage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  const title = post?.title ?? "VoteNow blog";

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
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600, color: "#c2410c" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: BRAND_ORANGE }} />
          {post?.tag ?? "Blog"}
        </div>
        <div style={{ fontSize: title.length > 60 ? 60 : 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1050 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#52525b" }}>
          <span>Secure online voting for organizations and student unions</span>
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
