import { imageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export function CandidateAvatar({ name, photoUrl, className }: { name: string; photoUrl: string | null; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <img src={imageUrl(photoUrl, 56)} alt={name} className={cn("h-12 w-12 flex-shrink-0 rounded-full border border-border object-cover", className)} />
    );
  }
  return (
    <div
      className={cn(
        "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 font-playfair text-sm font-bold text-amber-400",
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
