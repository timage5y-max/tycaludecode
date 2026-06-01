# reels — long footage → vertical captioned shorts

A small, transparent pipeline that turns long, unedited footage into
vertical (9:16) short-form clips with burned-in, word-highlighted captions.

It fills the gap that [`browser-use/video-use`](https://github.com/browser-use/video-use)
leaves for reels: **automatic clip selection**, **9:16 reframing**, and
**social-style captions**. Transcription is pluggable, so the same pipeline
runs against a cloud API or fully locally.

```
transcribe → select best window(s) → cut → reframe to 9:16 → burn captions
```

## Why this exists

`video-use` is excellent at *cleaning and editing* footage you hand it
(removing filler words, color grading, subtitles), but it does **not** find
the best moments, reframe horizontal → vertical, or optimize for short-form.
This tool adds exactly those pieces.

## Requirements

- **ffmpeg** + **ffprobe** on your `PATH` (system package)
- Python 3.9+
- A transcription backend (pick one):
  - **ElevenLabs Scribe** — set `ELEVENLABS_API_KEY`, `pip install requests`
  - **faster-whisper** (local) — `pip install faster-whisper`
  - or supply your own transcript with `--transcript file.json|.srt`

```bash
sudo apt-get install -y ffmpeg      # Debian/Ubuntu
pip install -r requirements.txt
```

## Quick start (no network, no real footage)

```bash
# generate a synthetic 16:9 sample + matching transcript
python examples/make_sample.py

# cut one ~18s vertical reel with captions
python -m reels make examples/sample.mp4 \
    --transcript examples/sample.json \
    --duration 18 --count 1 --reframe crop --out out
```

Output: `out/sample_reel01.mp4` — 1080×1920, captions burned in.

## Real usage

```bash
# 3 reels, transcribed locally with Whisper, blurred-background reframe
python -m reels make raw.mp4 --backend whisper --count 3 --reframe blur

# transcribe with ElevenLabs (set ELEVENLABS_API_KEY first)
python -m reels make raw.mp4 --backend elevenlabs --duration 30 --count 2
```

### Options

| flag | meaning | default |
|---|---|---|
| `--duration` | target clip length (s) | `30` |
| `--count` | how many reels to produce | `1` |
| `--reframe` | `crop` (center-crop), `blur` (blurred bg), `none` | `crop` |
| `--no-captions` | skip burned captions | off |
| `--backend` | `auto`, `elevenlabs`, `whisper`, `file` | `auto` |
| `--transcript` | use an existing `.json`/`.srt` (skips transcription) | — |
| `--width` / `--height` | output resolution | `1080` / `1920` |

`--transcript` JSON format: `[{"text": "...", "start": 1.2, "end": 1.5}, ...]`.

## How clip selection works

A sliding window scores every candidate position by:

- **speech density** (little dead air),
- **hook bonus** (clean opening, no long lead-in silence),
- **payoff bonus** (ends on a sentence boundary),
- **keyword bonus** (hook-y / emotional words near the start).

The highest-scoring, non-overlapping windows win. The scorer is a plain
heuristic in `reels/select.py`; you can pass an `llm_rerank` callback to
`select_clips` to let an LLM (e.g. Claude) re-rank candidates by virality.

## Module map

| file | role |
|---|---|
| `reels/model.py` | `Word`, `Transcript`, `Clip` data types |
| `reels/transcribe.py` | ElevenLabs / Whisper / file backends |
| `reels/select.py` | scoring + best-window selection |
| `reels/reframe.py` | 9:16 crop / blurred-pad ffmpeg filters |
| `reels/captions.py` | word-highlight (karaoke) ASS generation |
| `reels/ffmpeg.py` | ffprobe/ffmpeg wrappers |
| `reels/pipeline.py` | orchestration |
| `reels/cli.py` | `python -m reels make ...` |

## Limitations / roadmap

- Reframe is center-crop or blurred-pad; there is **no face/speaker
  tracking** yet (a moving subject can drift out of a center crop). Use
  `--reframe blur` to keep the whole frame visible.
- Clip selection is heuristic; wire in `llm_rerank` for smarter picks.

---

_for claude code by tamir yeshayahu_
