import fs from "fs";
import path from "path";
import { createRequire } from "module";

const root = path.resolve("..");
const require = createRequire(path.join(root, "package.json"));
const { v2: cloudinary } = require("cloudinary");

const envFile = path.join(root, process.argv[3] ?? ".env.vercel.production");
const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"(.*)"$/, "$1")];
    }),
);

cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const file = path.resolve(process.argv[2] ?? "out/votenow-promo.mp4");
const result = await cloudinary.uploader.upload(file, {
  resource_type: "video",
  folder: "vote-now/marketing",
  public_id: "votenow-promo",
  overwrite: true,
  invalidate: true,
});

console.log(JSON.stringify({ public_id: result.public_id, version: result.version, bytes: result.bytes, duration: result.duration, secure_url: result.secure_url }, null, 2));
