"use server";

import { cloudinaryConfigured, signUpload, type ImageKind, type UploadSignature } from "../server/cloudinary";
import type { ActionResult } from "../types";
import { fail, ok, requireElection, run } from "./guard";

export async function getUploadSignature(electionId: string, kind: ImageKind): Promise<ActionResult<UploadSignature>> {
  return run(async () => {
    await requireElection(electionId, "admin");
    if (kind !== "candidates" && kind !== "branding") return fail("Invalid upload type.");
    if (!cloudinaryConfigured()) return fail("Image uploads aren't configured yet. Add the Cloudinary keys to the environment.");
    return ok(signUpload(electionId, kind));
  });
}
