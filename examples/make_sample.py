"""Generate a synthetic 16:9 sample clip + matching word-level transcript.

Lets you exercise the full pipeline with no network and no real footage:

    python examples/make_sample.py
    python -m reels make examples/sample.mp4 --transcript examples/sample.json \
        --duration 20 --count 1 --reframe crop
"""

from __future__ import annotations

import json
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(HERE, "sample.mp4")
TRANSCRIPT = os.path.join(HERE, "sample.json")

SCRIPT = (
    "here is the biggest mistake people make when they start editing video. "
    "they try to keep everything. but the secret is to cut hard and keep only "
    "the moments that matter. watch what happens when you remove the filler. "
    "the story gets tighter and your audience never looks away. that is how "
    "you turn raw footage into a reel that actually holds attention."
).split()


def build_transcript(words, start=2.0, wps=2.4):
    """Spread words evenly at ~wps words/sec, starting at `start` seconds."""
    out = []
    t = start
    step = 1.0 / wps
    for w in words:
        out.append({"text": w, "start": round(t, 2), "end": round(t + step * 0.9, 2)})
        t += step
    return out


def main():
    words = build_transcript(SCRIPT)
    with open(TRANSCRIPT, "w", encoding="utf-8") as fh:
        json.dump(words, fh, indent=2)

    total = words[-1]["end"] + 2.0
    # 1280x720 test pattern + a 220Hz tone so the file has a real audio stream.
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"testsrc=size=1280x720:rate=30:duration={total:.1f}",
        "-f", "lavfi", "-i", f"sine=frequency=220:duration={total:.1f}",
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-shortest", VIDEO,
    ], check=True)
    print(f"wrote {VIDEO} ({total:.1f}s) and {TRANSCRIPT} ({len(words)} words)")


if __name__ == "__main__":
    main()
