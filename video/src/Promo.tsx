import { AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile } from "remotion";
import { Ballot } from "./scenes/Ballot";
import { Brand } from "./scenes/Brand";
import { Create } from "./scenes/Create";
import { Cta } from "./scenes/Cta";
import { Hook } from "./scenes/Hook";
import { Phone } from "./scenes/Phone";
import { Results } from "./scenes/Results";
import { Trust } from "./scenes/Trust";
import { Voters } from "./scenes/Voters";
import timing from "./timing.json";
import { sceneStarts, TOTAL_FRAMES } from "./timing";
import { Aurora } from "./ui/Aurora";

const SCENES = {
  hook: Hook,
  brand: Brand,
  create: Create,
  ballot: Ballot,
  voters: Voters,
  phone: Phone,
  results: Results,
  trust: Trust,
  cta: Cta,
} as const;

export function Promo() {
  const starts = sceneStarts();
  const hasMusic = getStaticFiles().some((f) => f.name === "music.mp3");

  return (
    <AbsoluteFill className="bg-paper font-sans">
      <Aurora />
      {(Object.keys(SCENES) as (keyof typeof SCENES)[]).map((name) => {
        const Component = SCENES[name];
        const { from, duration } = starts[name];
        return (
          <Sequence key={name} from={from} durationInFrames={duration} name={name}>
            <Component duration={duration} />
          </Sequence>
        );
      })}
      {hasMusic && (
        <Audio
          src={staticFile("music.mp3")}
          trimBefore={(timing as { audioTrimFrames?: number }).audioTrimFrames ?? 0}
          volume={(f) =>
            interpolate(f, [0, 8, TOTAL_FRAMES - 45, TOTAL_FRAMES], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      )}
    </AbsoluteFill>
  );
}
