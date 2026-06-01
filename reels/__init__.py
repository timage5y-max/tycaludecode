"""reels — turn long footage into vertical, captioned short-form clips.

Pipeline: transcribe -> select best window(s) -> cut -> reframe to 9:16 -> burn captions.
"""

from .model import Clip, Transcript, Word
from .pipeline import ReelResult, make_reels, render_clip

__all__ = ["Word", "Transcript", "Clip", "ReelResult", "make_reels", "render_clip"]
__version__ = "0.1.0"
