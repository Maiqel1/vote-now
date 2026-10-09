import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const FPS = 30;
const RATE = 22050;
const HOP = 256;
const input = path.resolve(process.argv[2] ?? "public/music.mp3");
const outFile = path.resolve("src/timing.json");

if (!fs.existsSync(input)) {
  console.error(`No track found at ${input}. Save your music as video/public/music.mp3 first.`);
  process.exit(1);
}

const decoded = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-i", input, "-ac", "1", "-ar", String(RATE), "-acodec", "pcm_s16le", "-f", "wav", "-"], {
  shell: true,
  maxBuffer: 1024 * 1024 * 512,
});
if (decoded.status !== 0) {
  console.error(decoded.stderr.toString());
  process.exit(1);
}
const buf = decoded.stdout;
let dataStart = 12;
while (dataStart + 8 <= buf.length && buf.toString("ascii", dataStart, dataStart + 4) !== "data") {
  dataStart += 8 + buf.readUInt32LE(dataStart + 4);
}
dataStart += 8;
const sampleCount = Math.floor((buf.length - dataStart) / 2);
const samples = new Float32Array(sampleCount);
for (let i = 0; i < sampleCount; i++) samples[i] = buf.readInt16LE(dataStart + i * 2) / 32768;
const seconds = samples.length / RATE;

const frames = Math.floor(samples.length / HOP);
const energy = new Float32Array(frames);
for (let i = 0; i < frames; i++) {
  let sum = 0;
  for (let j = 0; j < HOP; j++) {
    const v = samples[i * HOP + j];
    sum += v * v;
  }
  energy[i] = Math.log1p(1000 * Math.sqrt(sum / HOP));
}

const onset = new Float32Array(frames);
for (let i = 1; i < frames; i++) onset[i] = Math.max(0, energy[i] - energy[i - 1]);
const mean = onset.reduce((a, v) => a + v, 0) / frames;
for (let i = 0; i < frames; i++) onset[i] = Math.max(0, onset[i] - mean);

const hopSeconds = HOP / RATE;
let best = { bpm: 120, score: -Infinity };
for (let bpm = 80; bpm <= 170; bpm += 0.25) {
  const lag = 60 / bpm / hopSeconds;
  let score = 0;
  for (let i = 0; i + Math.ceil(lag * 2) < frames; i++) {
    score += onset[i] * (onset[Math.round(i + lag)] + 0.5 * onset[Math.round(i + 2 * lag)]);
  }
  score /= Math.max(1, frames - lag);
  if (score > best.score) best = { bpm, score };
}

let bpm = best.bpm;
while (bpm < 100) bpm *= 2;
while (bpm > 140) bpm /= 2;

const beatSeconds = 60 / bpm;
const beatHops = beatSeconds / hopSeconds;
let phase = { offset: 0, score: -Infinity };
for (let offsetHop = 0; offsetHop < beatHops; offsetHop += 0.5) {
  let score = 0;
  for (let t = offsetHop; t < frames; t += beatHops) {
    const k = Math.round(t);
    score += onset[k] + 0.5 * (onset[k - 1] ?? 0) + 0.5 * (onset[k + 1] ?? 0);
  }
  if (score > phase.score) phase = { offset: offsetHop, score };
}
const firstBeatSeconds = phase.offset * hopSeconds;

const window = Math.round(2 / hopSeconds);
let drop = { at: 0, rise: -Infinity };
for (let i = window; i + window < frames; i++) {
  let before = 0;
  let after = 0;
  for (let j = 1; j <= window; j++) {
    before += energy[i - j];
    after += energy[i + j];
  }
  const rise = (after - before) / window;
  if (rise > drop.rise) drop = { at: i * hopSeconds, rise };
}
const dropBeat = Math.round((drop.at - firstBeatSeconds) / beatSeconds);
const scenes = JSON.parse(fs.readFileSync(path.resolve("src/scenes.json"), "utf8"));
const TOTAL_BEATS = Object.values(scenes).reduce((a, n) => a + n, 0);
const DROP_TARGET_BEAT = scenes.hook;
const trimBeats = Math.max(0, dropBeat - DROP_TARGET_BEAT);
const trimSeconds = trimBeats * beatSeconds;

const timing = {
  bpm: Math.round(bpm * 100) / 100,
  offsetFrames: Math.round(firstBeatSeconds * FPS),
  source: path.basename(input),
  trackSeconds: Math.round(seconds * 10) / 10,
  biggestLiftAtBeat: dropBeat,
  audioTrimFrames: Math.round(trimSeconds * FPS),
};
fs.writeFileSync(outFile, JSON.stringify(timing, null, 2) + "\n");
const videoSeconds = (timing.offsetFrames + TOTAL_BEATS * (60 / bpm) * FPS) / FPS;
const usableSeconds = seconds - trimSeconds;
console.log(`Tempo: ${timing.bpm} BPM (raw estimate ${best.bpm})`);
console.log(`First beat: ${firstBeatSeconds.toFixed(3)}s (frame ${timing.offsetFrames})`);
console.log(`Biggest energy lift: ${drop.at.toFixed(2)}s, around beat ${dropBeat}`);
console.log(`Track length: ${timing.trackSeconds}s, video length at this tempo: ${videoSeconds.toFixed(1)}s`);
console.log(trimBeats > 0 ? `Music starts ${trimBeats} beats in (${trimSeconds.toFixed(2)}s) so the drop lands on the logo reveal.` : "Music starts from the top.");
if (usableSeconds < videoSeconds) console.log("WARNING: the usable part of the track is shorter than the video; it will end early.");
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
