"""End-to-end reel pipeline: transcribe -> select -> cut -> reframe -> caption."""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, replace
from typing import List, Optional

from . import captions as caps
from . import ffmpeg, reframe, transcribe
from .model import Clip, Transcript, Word
from .select import select_clips


@dataclass
class ReelResult:
    path: str
    clip: Clip
    text: str


def _rebase_words(words: List[Word], origin: float) -> List[Word]:
    """Shift word timings so the clip starts at t=0, dropping out-of-range words."""
    out = []
    for w in words:
        out.append(Word(text=w.text, start=max(0.0, w.start - origin), end=max(0.0, w.end - origin)))
    return out


def render_clip(
    src: str,
    clip: Clip,
    transcript: Transcript,
    out_path: str,
    *,
    reframe_mode: str = "crop",
    burn_captions: bool = True,
    target_w: int = 1080,
    target_h: int = 1920,
) -> ReelResult:
    info = ffmpeg.probe(src)
    duration = clip.duration

    filters: List[str] = []
    if reframe_mode != "none":
        filters.append(reframe.build_filter(info, target_w, target_h, reframe_mode))

    ass_path: Optional[str] = None
    if burn_captions:
        rel_words = _rebase_words(transcript.words_between(clip.start, clip.end), clip.start)
        if rel_words:
            ass = caps.build_ass(rel_words, video_w=target_w, video_h=target_h)
            fd, ass_path = tempfile.mkstemp(suffix=".ass")
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(ass)
            # subtitles filter: escape path separators for the filtergraph parser
            esc = ass_path.replace("\\", "\\\\").replace(":", "\\:")
            filters.append(f"subtitles='{esc}'")

    vf = ",".join(filters) if filters else None

    args = ["-ss", f"{clip.start:.3f}", "-i", src, "-t", f"{duration:.3f}"]
    if vf:
        args += ["-vf", vf]
    args += [
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out_path,
    ]
    try:
        ffmpeg.run(args)
    finally:
        if ass_path and os.path.exists(ass_path):
            os.remove(ass_path)

    return ReelResult(path=out_path, clip=clip, text=transcript.text_between(clip.start, clip.end))


def make_reels(
    src: str,
    out_dir: str = "out",
    *,
    duration: float = 30.0,
    count: int = 1,
    reframe_mode: str = "crop",
    burn_captions: bool = True,
    backend: str = "auto",
    transcript_path: Optional[str] = None,
    target_w: int = 1080,
    target_h: int = 1920,
    whisper_model: str = "base",
) -> List[ReelResult]:
    """Produce up to ``count`` vertical reels of ~``duration`` seconds from ``src``."""
    ffmpeg.ensure_ffmpeg()
    os.makedirs(out_dir, exist_ok=True)

    if transcript_path:
        transcript = transcribe.transcribe_file(transcript_path)
    else:
        kwargs = {"model_size": whisper_model} if backend in ("whisper", "auto") else {}
        transcript = transcribe.transcribe(src, backend=backend, **kwargs)

    if not transcript.words:
        raise RuntimeError("transcript is empty; cannot select clips")

    clips = select_clips(transcript, target=duration, count=count)

    results: List[ReelResult] = []
    base = os.path.splitext(os.path.basename(src))[0]
    for i, clip in enumerate(clips, 1):
        out_path = os.path.join(out_dir, f"{base}_reel{i:02d}.mp4")
        results.append(
            render_clip(
                src, clip, transcript, out_path,
                reframe_mode=reframe_mode, burn_captions=burn_captions,
                target_w=target_w, target_h=target_h,
            )
        )
    return results
