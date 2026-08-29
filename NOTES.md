# Working notes

Running state of this branch — what is built, what was decided, what is open.
Written so a fresh session can pick up without re-deriving anything.

## Built and pushed

`VenueReveal` (`src/venue/`) — 23s, 1920x1080 @ 30fps. A hand sketches a
blueprint of a beach wedding venue in pencil, the plan is dimensioned and
signed, then it cross-dissolves into the photograph of the finished event.

Three decisions in it are load-bearing and worth not undoing by accident:

- **The plan is drawn in the photograph's coordinate space**, not as a top-down
  plan. That is why the dissolve lands element for element instead of swapping
  two pictures.
- **Geometry was measured, not estimated.** Table centres come from peak
  detection on a "not grass" mask over the photo; the symmetry axis (x=982) is
  the midpoint four independent left/right pairs agreed on. `CalibrationOverlay`
  is the composition that was tuned against — keep it.
- **`drawables.ts` is one ordered stroke list**, rendered by the plan and read by
  the hand. The hand asks the stroke being drawn where its leading edge is, with
  the same easing the stroke uses. Splitting that source would let the pencil
  drift off the line.

Also: rendering is no longer pinned to one core (measured 1.5x on 4 cores).

## Open decisions

**Repo structure.** Recommendation, not yet applied: move the Remotion project
into `remotion/` and put new work beside it as sibling folders, rather than on
separate branches. Two frameworks on two branches can never be seen at once
(checkout swaps the tree), never merge, and fight over lockfiles and the 3.8MB
photo. Folders keep the option of splitting to separate repos later; the reverse
is painful.

**Which framework.** Undecided. See the comparison below.

**Whether to build a "video factory" web app.** Advice given: prove the pipeline
as a CLI on 3-4 real weddings first. The website is the easy half.

## What was researched (read, not run)

Both clones live outside this repo and are lost when the container is reclaimed;
both are public and re-clonable.

**`heygen-com/hyperframes`** — HeyGen's open-source Remotion alternative.
Apache 2.0, npm `hyperframes`, Node 22+, bun monorepo, 14 packages. Write HTML +
CSS + one paused GSAP timeline registered on `window.__timelines`; the renderer
seeks it. Timing lives in `data-*` attributes in seconds, not frames.

The consequence: it is **seek-driven** where Remotion is **frame-driven**. Its
own migration skill (`remotion-to-hyperframes`) blocks React state machines —
`useState`, `useReducer`, `useEffect` with deps — because they are not
deterministic capture targets. It estimates ~80% of typical compositions
translate mechanically. Remotion is the general React renderer; HyperFrames is
narrower on purpose.

Ships 20 agent skills and distributed rendering (`@hyperframes/aws-lambda`,
`gcp-cloud-run` with Dockerfile + terraform).

`VenueReveal` would mostly port — it is pure and frame-derived. The pencil hand
would not: it measures DOM with `getPointAtLength` at render time, which would
have to be rebuilt as a GSAP motion path.

**`browser-use/video-use`** — a Claude Code skill that edits footage. Pipeline:
transcribe (ElevenLabs) → editor sub-agent writes `edl.json` → parallel
sub-agents build animations (it names Remotion and HyperFrames as engines) →
`grade.py` → `render.py` composes → self-check → `project.md` remembers.

Its cutting engine is **speech-driven** ("audio is primary, cut candidates come
from speech boundaries and silence gaps"). So:

- Good fit: speeches, vows, interviews.
- No mechanism: music-driven montage. `librosa` is a dependency but only draws a
  waveform — there is no beat detection, no shot classification, no aesthetic
  scoring.

Its composition half (`render.py`, 659 lines — per-segment extract, lossless
concat, 30ms fades, PTS-shifted overlays, portrait detection) is correct and
reusable regardless.

## Next step

The one missing piece for a music-driven Instagram teaser: a script taking a
music track plus clips, deriving beat times, and emitting a valid `edl.json` —
the format `render.py` already consumes. Roughly 150-250 lines. Everything
around it exists.

Caveat worth testing early: Hebrew transcription quality in ElevenLabs is
unverified, and the speech half depends on it entirely.
