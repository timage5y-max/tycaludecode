"""Core data structures shared across the reels pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class Word:
    """A single transcribed word with timing in seconds."""

    text: str
    start: float
    end: float

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)


@dataclass
class Transcript:
    """Word-level transcript of an audio/video file."""

    words: List[Word] = field(default_factory=list)

    @property
    def duration(self) -> float:
        return self.words[-1].end if self.words else 0.0

    def words_between(self, start: float, end: float) -> List[Word]:
        """Words whose midpoint falls inside [start, end)."""
        out = []
        for w in self.words:
            mid = (w.start + w.end) / 2
            if start <= mid < end:
                out.append(w)
        return out

    def text_between(self, start: float, end: float) -> str:
        return " ".join(w.text for w in self.words_between(start, end))


@dataclass
class Clip:
    """A selected segment of the source video."""

    start: float
    end: float
    score: float = 0.0
    reason: str = ""

    @property
    def duration(self) -> float:
        return self.end - self.start
