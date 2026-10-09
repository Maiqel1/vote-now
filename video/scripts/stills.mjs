import path from "path";
import { bundle } from "@remotion/bundler";
import { enableTailwind } from "@remotion/tailwind";
import { renderStill, selectComposition } from "@remotion/renderer";

const frames = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const serveUrl = await bundle({
  entryPoint: path.resolve("src/index.ts"),
  webpackOverride: (config) => enableTailwind(config),
});
const composition = await selectComposition({ serveUrl, id: "VoteNowPromo" });
for (const frame of frames) {
  const output = path.resolve(`out/stills/f${String(frame).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, output, frame, scale: 0.5 });
  console.log("rendered", output);
}
