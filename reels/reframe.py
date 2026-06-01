"""Reframe a (typically 16:9) source into a vertical 9:16 video.

Two modes, both common for social reels:

    crop  - center-crop the source to the target aspect, then scale.
            Best for talking heads where the subject is centred.
    blur  - scale the whole frame to fit the target width and fill the
            top/bottom with a blurred, zoomed copy of the frame.
            Keeps the full frame visible (no cropping of content).

Filters use exact pixel values computed from the probed source size, which
avoids ffmpeg expression-escaping headaches.
"""

from __future__ import annotations

from .ffmpeg import VideoInfo


def build_filter(info: VideoInfo, target_w: int = 1080, target_h: int = 1920, mode: str = "crop") -> str:
    target_ar = target_w / target_h
    src_ar = info.aspect

    if mode == "crop":
        if src_ar > target_ar:
            cw = round(info.height * target_ar)
            cw -= cw % 2
            x = (info.width - cw) // 2
            crop = f"crop={cw}:{info.height}:{x}:0"
        else:
            ch = round(info.width / target_ar)
            ch -= ch % 2
            y = (info.height - ch) // 2
            crop = f"crop={info.width}:{ch}:0:{y}"
        return f"{crop},scale={target_w}:{target_h},setsar=1"

    if mode == "blur":
        bg = (
            f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,"
            f"crop={target_w}:{target_h},gblur=sigma=24"
        )
        fg = f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease"
        return (
            f"split=2[bg][fg];"
            f"[bg]{bg}[bg];"
            f"[fg]{fg}[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1"
        )

    raise ValueError(f"unknown reframe mode: {mode!r}")
