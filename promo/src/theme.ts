import { Easing, cancelRender, continueRender, delayRender, staticFile } from "remotion";
import faces from "./fontFaces.json";

// Fonts are bundled in public/fonts (Cormorant Garamond, Frank Ruhl Libre, Heebo; all OFL).
const handle = delayRender("fonts");
Promise.all(
  faces.map((f) =>
    new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)})`, {
      style: f.style,
      weight: f.weight,
      unicodeRange: f.range,
    })
      .load()
      .then((ff) => document.fonts.add(ff)),
  ),
)
  .then(() => continueRender(handle))
  .catch((e) => cancelRender(e));

export const serif = "'Cormorant Garamond', serif";
export const hebSerif = "'Frank Ruhl Libre', serif";
export const sans = "'Heebo', sans-serif";

export const C = {
  bg: "#0B0F1A",
  ivory: "#F3ECE1",
  gold: "#C9A978",
  muted: "rgba(243,236,225,0.62)",
};

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
