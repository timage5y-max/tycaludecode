import { Composition } from "remotion";
import { Promo } from "./Promo";

export const FPS = 30;
export const DURATION = 600; // 20s

export const Root = () => (
  <Composition
    id="Promo"
    component={Promo}
    durationInFrames={DURATION}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
