# tycaludecode

for claude code by tamir yeshayahu

Remotion project for programmatic video creation. This is the permanent working
branch for all Remotion video work.

## Requirements

- Node.js 18+
- A Chromium build. In sandboxed/CI containers one is detected automatically
  (see below); locally Remotion downloads its own on first render.

## Setup

```bash
npm ci
```

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Open Remotion Studio to preview and scrub compositions |
| `npm run build` | Render `YoutubeIntro` to `out/youtube-intro.mp4` |
| `npm run render <id> <out>` | Render any composition |
| `npm run still <id> <out>` | Render a single frame as an image |
| `npm run typecheck` | Type-check the project |

Render a range of frames while iterating, which is much faster than a full pass:

```bash
npm run render YoutubeIntro out/preview.mp4 -- --frames=0-59
```

## Compositions

Registered in `src/Root.tsx`. All are 1920x1080 at 30fps.

- **`HelloWorld`** (`src/HelloWorld.tsx`) - 5s. Spring-animated Hebrew title with
  an RTL layout and an animated gradient background. Takes `titleText` and
  `subtitleText` props.
- **`YoutubeIntro`** (`src/YoutubeIntro.tsx`) - 12s. Cinematic "film by" title
  card: letterbox bars slide in, a vignette fades up, the text fades in while its
  letter-spacing tightens, and the whole frame slow-zooms before fading to black.

## Adding a composition

1. Create the component in `src/`.
2. Register it with a `<Composition>` in `src/Root.tsx`, giving it an `id`,
   `durationInFrames`, `fps`, `width`, and `height`.
3. Preview it with `npm start`.

Drive animation from `useCurrentFrame()` and keep components pure - the same
frame must always produce the same output, or rendering and preview will drift.

## Fonts

`public/fonts/` holds the CinematicSerif faces used by `YoutubeIntro`. They are
loaded via the `FontFace` API and gated behind `delayRender`/`continueRender`, so
rendering waits for the font instead of capturing unstyled frames. Reference any
file under `public/` with `staticFile()`, never a raw path.

## Browser resolution

`remotion.config.ts` picks a Chromium executable in this order:

1. `REMOTION_BROWSER_EXECUTABLE`
2. `CHROME_PATH`
3. A Playwright Chromium under `PLAYWRIGHT_BROWSERS_PATH` (default
   `/opt/pw-browsers`), if present

If none is found, the setting is left alone and Remotion resolves a browser
itself. This keeps renders working both in containers and on a local machine.
