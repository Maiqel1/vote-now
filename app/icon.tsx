import { ImageResponse } from "next/og";
import { BrandIcon } from "@/components/brand/BrandIcon";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandIcon size={32} radius={7} />, size);
}
