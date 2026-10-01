import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { imageUrl, isAllowedImageUrl } from "@/lib/image-url";
import { electionImageFolder, signUpload } from "@/lib/server/cloudinary";

const ENV = {
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "votenow-test",
  CLOUDINARY_API_KEY: "123456",
  CLOUDINARY_API_SECRET: "shhh-secret",
  CLOUDINARY_FOLDER: "vote-now/staging",
};
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
});

afterEach(() => {
  for (const key of Object.keys(ENV)) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const good = "https://res.cloudinary.com/votenow-test/image/upload/v1712345678/vote-now/staging/elections/abc123XYZ/candidates/x1y2z3.jpg";

describe("isAllowedImageUrl", () => {
  it("accepts images uploaded to this cloud and environment folder", () => {
    expect(isAllowedImageUrl(good)).toBe(true);
    expect(isAllowedImageUrl(good.replace("/v1712345678", ""))).toBe(true);
  });

  it("rejects other clouds, hosts and environments", () => {
    expect(isAllowedImageUrl(good.replace("votenow-test", "someone-else"))).toBe(false);
    expect(isAllowedImageUrl(good.replace("res.cloudinary.com", "evil.example.com"))).toBe(false);
    expect(isAllowedImageUrl(good.replace("vote-now/staging", "vote-now/production"))).toBe(false);
    expect(isAllowedImageUrl(good.replace("https:", "http:"))).toBe(false);
  });

  it("rejects tricks and junk", () => {
    expect(isAllowedImageUrl(`${good}?x=1`)).toBe(false);
    expect(isAllowedImageUrl(good.replace("/elections/", "/elections/../../other/"))).toBe(false);
    expect(isAllowedImageUrl("https://res.cloudinary.com/votenow-test/video/upload/vote-now/staging/elections/a/b.mp4")).toBe(false);
    expect(isAllowedImageUrl("not a url")).toBe(false);
  });

  it("rejects everything when Cloudinary isn't configured", () => {
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    expect(isAllowedImageUrl(good)).toBe(false);
  });
});

describe("imageUrl", () => {
  it("inserts a resize transformation at 2x for sharp screens", () => {
    expect(imageUrl(good, 56)).toBe(good.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,g_face,w_112,h_112/"));
    expect(imageUrl(good, 32, "fit")).toContain("/image/upload/f_auto,q_auto,c_fit,w_64,h_64/v1712345678/");
  });

  it("leaves non-Cloudinary URLs untouched", () => {
    expect(imageUrl("https://example.com/a.jpg", 56)).toBe("https://example.com/a.jpg");
  });
});

describe("signUpload", () => {
  it("signs the folder, formats and timestamp the way Cloudinary verifies them", () => {
    const signed = signUpload("abc123XYZ", "candidates");
    expect(signed.folder).toBe("vote-now/staging/elections/abc123XYZ/candidates");
    expect(signed.cloudName).toBe("votenow-test");
    expect(signed.apiKey).toBe("123456");
    expect(JSON.stringify(signed)).not.toContain("shhh-secret");
    const toSign = `allowed_formats=jpg,png,webp&folder=${signed.folder}&timestamp=${signed.timestamp}`;
    expect(signed.signature).toBe(createHash("sha1").update(toSign + "shhh-secret").digest("hex"));
  });

  it("scopes folders per election", () => {
    expect(electionImageFolder("e1")).toBe("vote-now/staging/elections/e1");
    expect(electionImageFolder("e1", "branding")).toBe("vote-now/staging/elections/e1/branding");
  });
});
