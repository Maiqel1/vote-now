function cloudName(): string {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
}

export function cloudinaryFolder(): string {
  return (process.env.CLOUDINARY_FOLDER ?? "vote-now/local").replace(/^\/+|\/+$/g, "");
}

export function isAllowedImageUrl(url: string): boolean {
  const cloud = cloudName();
  if (!cloud) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || parsed.search || parsed.hash) return false;
  const prefix = `/${cloud}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) return false;
  const rest = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, "");
  return rest.startsWith(`${cloudinaryFolder()}/elections/`) && !rest.includes("..");
}

export function imageUrl(url: string, size: number, crop: "fill" | "fit" = "fill"): string {
  const marker = "/image/upload/";
  const index = url.indexOf(marker);
  if (!url.startsWith("https://res.cloudinary.com/") || index === -1) return url;
  const px = Math.round(size * 2);
  const transform = crop === "fill" ? `c_fill,g_face,w_${px},h_${px}` : `c_fit,w_${px},h_${px}`;
  return `${url.slice(0, index + marker.length)}f_auto,q_auto,${transform}/${url.slice(index + marker.length)}`;
}
