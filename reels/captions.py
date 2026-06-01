"""Generate burned-in, word-highlighted (karaoke-style) captions as ASS.

We emit an Advanced SubStation Alpha (.ass) file because it supports the
"active word lights up" look that reels rely on, via per-word ``\\k`` tags:
already-spoken text uses the PrimaryColour (highlight), upcoming text uses
the SecondaryColour.

All timings are CLIP-RELATIVE (the clip is cut so it starts at t=0).
"""

from __future__ import annotations

from typing import List

from .model import Word


def _ts(seconds: float) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs == 100:  # rounding spillover
        cs = 0
        s += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _escape(text: str) -> str:
    return text.replace("{", "(").replace("}", ")")


def group_lines(words: List[Word], max_words: int = 5, max_gap: float = 0.7) -> List[List[Word]]:
    """Break a word stream into caption lines on count or pause boundaries."""
    lines: List[List[Word]] = []
    cur: List[Word] = []
    for w in words:
        if cur and (len(cur) >= max_words or (w.start - cur[-1].end) > max_gap):
            lines.append(cur)
            cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return lines


def build_ass(
    words: List[Word],
    video_w: int = 1080,
    video_h: int = 1920,
    font: str = "DejaVu Sans",
    font_size: int = 78,
    highlight: str = "&H0000FFFF",   # ASS BGR: yellow
    base: str = "&H00FFFFFF",        # white
    outline: str = "&H00000000",     # black
    margin_v: int = 320,             # distance from bottom
    max_words: int = 4,
) -> str:
    """Return the full contents of an .ass subtitle file."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_w}
PlayResY: {video_h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Reel,{font},{font_size},{highlight},{base},{outline},&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,80,80,{margin_v},1

[Events]
Format: Layer, Start, End, Style, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    for line in group_lines(words, max_words=max_words):
        start, end = line[0].start, line[-1].end
        parts = []
        prev_end = start
        for w in line:
            # carry any intra-line gap as un-highlighted dead time
            gap = max(0, round((w.start - prev_end) * 100))
            if gap:
                parts.append(f"{{\\k{gap}}}")
            dur = max(1, round((w.end - w.start) * 100))
            parts.append(f"{{\\k{dur}}}{_escape(w.text)} ")
            prev_end = w.end
        text = "".join(parts).rstrip()
        events.append(f"Dialogue: 0,{_ts(start)},{_ts(end)},Reel,,0,0,0,,{text}")

    return header + "\n".join(events) + "\n"
