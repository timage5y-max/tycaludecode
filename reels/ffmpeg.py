"""Thin wrappers around ffmpeg / ffprobe."""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass


def ensure_ffmpeg() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise RuntimeError(f"{tool} not found on PATH. Install ffmpeg first.")


@dataclass
class VideoInfo:
    width: int
    height: int
    duration: float
    has_audio: bool

    @property
    def aspect(self) -> float:
        return self.width / self.height if self.height else 0.0


def probe(path: str) -> VideoInfo:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json",
         "-show_streams", "-show_format", path],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if v is None:
        raise RuntimeError("no video stream found")
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    return VideoInfo(
        width=int(v["width"]),
        height=int(v["height"]),
        duration=float(data["format"]["duration"]),
        has_audio=has_audio,
    )


def run(args: list[str]) -> None:
    """Run ffmpeg, raising with stderr on failure."""
    proc = subprocess.run(["ffmpeg", "-y", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{proc.stderr[-2000:]}")
