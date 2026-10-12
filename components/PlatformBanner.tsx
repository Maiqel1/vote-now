import { getPlatformConfig } from "@/lib/server/platform-config";
import { cn } from "@/lib/utils";

export async function PlatformBanner({ variant = "bar" }: { variant?: "bar" | "card" }) {
  const { banner } = await getPlatformConfig();
  if (!banner) return null;
  const tone = banner.tone === "warning" ? "border-warning/25 bg-warning-soft text-warning" : "border-info/25 bg-info-soft text-info";
  return (
    <div
      role="status"
      className={cn(
        tone,
        variant === "bar" ? "border-b px-4 py-2.5 text-center text-xs md:text-sm" : "mb-6 rounded-xl border px-4 py-3 text-sm",
      )}
    >
      {banner.message}
    </div>
  );
}
