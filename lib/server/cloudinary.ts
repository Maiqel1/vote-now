import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryFolder, isAllowedImageUrl } from "../image-url";

export type ImageKind = "candidates" | "branding";

export const ALLOWED_FORMATS = "jpg,png,webp";

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

function client() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export function electionImageFolder(electionId: string, kind?: ImageKind): string {
  const base = `${cloudinaryFolder()}/elections/${electionId}`;
  return kind ? `${base}/${kind}` : base;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
}

export function signUpload(electionId: string, kind: ImageKind): UploadSignature {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = electionImageFolder(electionId, kind);
  const signature = cloudinary.utils.api_sign_request(
    { allowed_formats: ALLOWED_FORMATS, folder, timestamp },
    process.env.CLOUDINARY_API_SECRET as string,
  );
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    timestamp,
    signature,
    folder,
    allowedFormats: ALLOWED_FORMATS,
  };
}

export async function deleteElectionImages(electionId: string): Promise<void> {
  if (!cloudinaryConfigured()) return;
  const api = client().api;
  const folder = electionImageFolder(electionId);
  try {
    await api.delete_resources_by_prefix(`${folder}/`);
    for (const kind of ["candidates", "branding"] as const) {
      await api.delete_folder(`${folder}/${kind}`).catch(() => undefined);
    }
    await api.delete_folder(folder).catch(() => undefined);
  } catch (error) {
    console.error("Cloudinary cleanup failed", error);
  }
}

export async function copyImageToElection(url: string | null, electionId: string, kind: ImageKind): Promise<string | null> {
  if (!url || !cloudinaryConfigured() || !isAllowedImageUrl(url)) return null;
  try {
    const result = await client().uploader.upload(url, { folder: electionImageFolder(electionId, kind), resource_type: "image" });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary copy failed", error);
    return null;
  }
}
