import "./style.css";
import "./fonts";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./timing";

export function RemotionRoot() {
  return <Composition id="VoteNowPromo" component={Promo} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />;
}
