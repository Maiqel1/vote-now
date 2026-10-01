"use client";

import { getUploadSignature } from "@/lib/actions/uploads";
import { resizeImage } from "./image";

export async function uploadElectionImage(
  electionId: string,
  kind: "candidates" | "branding",
  file: File,
  maxSize = 640,
): Promise<string> {
  const [signed, blob] = await Promise.all([getUploadSignature(electionId, kind), resizeImage(file, maxSize)]);
  if (!signed.ok) throw new Error(signed.error);
  const { cloudName, apiKey, timestamp, signature, folder, allowedFormats } = signed.data;

  const form = new FormData();
  form.append("file", blob, "image.jpg");
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("allowed_formats", allowedFormats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "Upload failed. Please try again.");
  return data.secure_url;
}
